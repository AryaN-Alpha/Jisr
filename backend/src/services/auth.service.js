const prisma = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { AppError } = require('../middlewares/error.middleware');

/**
 * Register new user
 */
function normalizeRecoveryAnswer(answer) {
  return String(answer || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const register = async (userData) => {
  const { name, password, accountType, recoveryQuestion, recoveryAnswer } = userData;
  const email = String(userData.email || '').trim().toLowerCase();

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  let recoveryAnswerHash = null;
  if (recoveryQuestion && recoveryAnswer) {
    recoveryAnswerHash = await hashPassword(normalizeRecoveryAnswer(recoveryAnswer));
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      accountType: accountType || 'parent',
      role: accountType === 'admin' ? 'ADMIN' : 'USER',
      recoveryQuestion: recoveryQuestion || null,
      recoveryAnswerHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountType: true,
      createdAt: true,
    },
  });

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Save refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return {
    user,
    accessToken,
    refreshToken,
  };
};

/**
 * Login user
 */
const login = async (email, password) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.blocked) {
    throw new AppError('Your account has been suspended. Please contact support.', 403);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Save refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Refresh access token
 */
const refreshToken = async (refreshToken) => {
  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Check if token exists in database
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  if (decoded.userId !== tokenRecord.userId) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Always derive the user from the DB record, not JWT payload alone
  const accessToken = generateAccessToken(tokenRecord.userId);

  return {
    accessToken,
  };
};

/**
 * Logout user
 */
const logout = async (refreshToken) => {
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }
};

/**
 * Get current user
 */
const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountType: true,
      emailVerified: true,
      blocked: true,
      restrictions: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Child login via username + PIN
 */
const childLogin = async (username, pin) => {
  const childService = require('./child.service');
  const { child, parentUserId } = await childService.authenticateChild(username, pin);

  // Generate tokens scoped to the parent user (so existing APIs work)
  const accessToken = generateAccessToken(parentUserId);
  const refreshToken_ = generateRefreshToken(parentUserId);

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken_,
      userId: parentUserId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    child,
    accessToken,
    refreshToken: refreshToken_,
  };
};

/**
 * Return recovery question if the account exists and has recovery configured.
 */
const getRecoveryQuestion = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { recoveryQuestion: true, recoveryAnswerHash: true },
  });
  if (!user || !user.recoveryQuestion || !user.recoveryAnswerHash) {
    return null;
  }
  return user.recoveryQuestion;
};

/**
 * Reset password using recovery answer (no email provider required).
 */
const resetPasswordWithRecovery = async (email, recoveryAnswer, newPassword) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user || !user.recoveryAnswerHash) {
    throw new AppError('Invalid email or security answer.', 400);
  }

  const ok = await comparePassword(normalizeRecoveryAnswer(recoveryAnswer), user.recoveryAnswerHash);
  if (!ok) {
    throw new AppError('Invalid email or security answer.', 400);
  }

  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  return { success: true };
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  childLogin,
  getRecoveryQuestion,
  resetPasswordWithRecovery,
};

