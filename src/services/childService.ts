import { api, establishAuthSession, notifyChildrenChanged, resetAuthSession } from '../utils/api';
import { API_ENDPOINTS } from '../config/api';

/**
 * Child interface
 */
export interface Child {
  id: string;
  name: string;
  username?: string;
  age?: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
  settings?: any;
}

/**
 * Create child request
 */
export interface CreateChildRequest {
  name: string;
  age?: number;
  username?: string;
  pin?: string;
}

/**
 * Update child request
 */
export interface UpdateChildRequest {
  name?: string;
  age?: number;
  username?: string;
  pin?: string;
}

/**
 * Child login response
 */
export interface ChildLoginResponse {
  child: Child;
  accessToken: string;
  refreshToken: string;
}

/**
 * Child Service
 */
class ChildService {
  /**
   * Get all children for the current user
   */
  async getChildren(): Promise<Child[]> {
    const response = await api.get<Child[]>(API_ENDPOINTS.CHILDREN.LIST);

    if (response.status === 'success' && response.data) {
      return Array.isArray(response.data) ? response.data : [];
    }

    throw new Error(response.message || 'Failed to fetch children');
  }

  /**
   * Get a single child by ID
   */
  async getChild(id: string): Promise<Child> {
    const response = await api.get<Child>(API_ENDPOINTS.CHILDREN.GET(id));

    if (response.status === 'success' && response.data) {
      return response.data;
    }

    throw new Error(response.message || 'Failed to get child');
  }

  /**
   * Create a new child
   */
  async createChild(data: CreateChildRequest): Promise<Child> {
    const response = await api.post<Child>(API_ENDPOINTS.CHILDREN.CREATE, data);

    if (response.status === 'success' && response.data) {
      notifyChildrenChanged();
      return response.data;
    }

    throw new Error(response.message || 'Failed to create child');
  }

  /**
   * Update a child
   */
  async updateChild(id: string, data: UpdateChildRequest): Promise<Child> {
    const response = await api.put<Child>(API_ENDPOINTS.CHILDREN.UPDATE(id), data);

    if (response.status === 'success' && response.data) {
      notifyChildrenChanged();
      return response.data;
    }

    throw new Error(response.message || 'Failed to update child');
  }

  /**
   * Delete a child
   */
  async deleteChild(id: string): Promise<void> {
    const response = await api.delete(API_ENDPOINTS.CHILDREN.DELETE(id));

    if (response.status !== 'success') {
      throw new Error(response.message || 'Failed to delete child');
    }
    notifyChildrenChanged();
  }
}

/**
 * Child login (independent, no parent session needed)
 */
export async function childLogin(username: string, pin: string): Promise<ChildLoginResponse> {
  resetAuthSession();
  const response = await api.post<ChildLoginResponse>(API_ENDPOINTS.AUTH.CHILD_LOGIN, { username, pin }, { requireAuth: false });

  if (response.status === 'success' && response.data) {
    establishAuthSession(response.data.accessToken, response.data.refreshToken);
    return response.data;
  }

  throw new Error(response.message || 'Invalid username or PIN');
}

export const childService = new ChildService();
