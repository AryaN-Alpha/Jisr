import type { Language } from '../context/LanguageContext'

export type LandingFeature = {
  title: string
  description: string
  titleAr?: string
  descriptionAr?: string
}

export type LandingTestimonial = {
  name: string
  nameAr?: string | null
  role: string
  roleAr?: string | null
  quote: string
  quoteAr?: string | null
}

export type LandingAudience = {
  title: string
  blurb: string
  href: string
  titleAr?: string
  blurbAr?: string
}

export type LandingCopy = {
  features: LandingFeature[]
  steps: LandingFeature[]
  testimonials: LandingTestimonial[]
  audiences: LandingAudience[]
  [key: string]: any
}

/** Marketing / landing strings (EN + AR) */
export function landingCopy(language: Language): LandingCopy {
  const ar = language === 'ar'
  if (ar) {
    return {
      heroBullets: ['لا تحتاج بطاقة ائتمان', 'تجربة كاملة 14 يوماً', 'إلغاء في أي وقت'],
      featuresEyebrow: 'ما بداخل المنصة',
      featuresHeading: 'كل ما تحتاجه لدعم التواصل',
      howEyebrow: 'طريقة الاستخدام',
      howHeading: 'ثلاث خطوات بسيطة للتواصل',
      audiencesEyebrow: 'لمختلف الشرائح',
      audiencesHeading: 'للعائلات والمعالجين والمدارس',
      testimonialsEyebrow: 'محبوب من العائلات والاختصاصيين',
      testimonialsHeading: 'قصص حقيقية من مستخدمينا',
      ctaHeading: 'مستعد لمنح طفلك صوتاً؟',
      ctaSubtitle: 'ابدأ مجاناً اليوم وابني لوحة يحبها طفلك.',
      ctaPrimary: 'ابدأ مجاناً',
      ctaPricing: 'عرض الأسعار',
      demoTitle: 'جسر · لوحة التواصل',
      demoSpeak: 'تحدّث',
      demoChipAr: '🇸🇦 جاهز للعربية',
      demoChipSpeak: '✨ تحدّث فوراً',
      tapHint: 'اضغط على الصور لتكوين جملة',
      statWords: 'كلمة منطوقة عبر جسر',
      statParents: 'من الأهل يجدون اللوحة أسهل للإدارة',
      statLangs: 'لغات (إنجليزي وعربي)',
      statAccess: 'وصولاً من أي جهاز',
      learnMore: 'اعرف المزيد',
      pricingEyebrow: 'الخطط',
      pricingHeading: 'أسعار مرنة تناسب عائلتك',
      pricingIntro: 'قارِن الخطط أدناه أو افتح صفحة الأسعار الكاملة للاطلاع على التجربة المجانية والفوترة السنوية.',
      pricingViewFull: 'كل الخطط والتفاصيل',
      pricingPlans: [
        { id: 'free-plan', name: 'مجاناً', price: '0 ر.ع', blurb: 'لوحة أساسية للتجربة.' },
        { id: 'family-plan', name: 'عائلي', price: '~15$', blurb: 'مفردات غير محدودة وتقارير تقدّم.' },
        { id: 'family-plus-plan', name: 'عائلي بلس', price: '~25$', blurb: 'حتى 5 ملفات أطفال.' },
      ] as const,
      testimonials: testimonialsAr,
      features: featuresAr,
      steps: stepsAr,
      audiences: audiencesAr,
      statsVals: statsValsAr,
      heroTitle: 'ساعد كل طفل في العثور على صوته',
      heroSubtitle: 'جسر هو منصة تواصل بديلة (AAC) هادئة وسهلة الوصول تساعد الأطفال على بناء لغتهم بثقة.',
      heroEyebrow: 'منصة تواصل بديلة مبهجة',
    }
  }

  return {
    heroBullets: ['No credit card required', '14-day full-feature trial', 'Cancel anytime'],
    heroTitle: 'Help every child find their voice',
    heroSubtitle: 'Jisr is a calm, accessible AAC platform that helps kids build language confidence at their own pace.',
    heroEyebrow: 'AAC made joyful',
    featuresEyebrow: "What's inside",
    featuresHeading: 'Everything you need to support communication',
    howEyebrow: 'How it works',
    howHeading: 'Three simple steps to communication',
    audiencesEyebrow: 'Built for everyone',
    audiencesHeading: 'For families, therapists, and schools',
    testimonialsEyebrow: 'Loved by families and clinicians',
    testimonialsHeading: 'Real stories from real users',
    ctaHeading: 'Ready to give your child a voice?',
    ctaSubtitle: 'Start free today and build a board your child loves to use.',
    ctaPrimary: 'Start free',
    ctaPricing: 'View pricing',
    demoTitle: 'Jisr · Communication board',
    demoSpeak: 'Speak',
    demoChipAr: '🇸🇦 Arabic ready',
    demoChipSpeak: '✨ Speaks instantly',
    tapHint: 'Tap pictures to make a sentence',
    statWords: 'words spoken with Jisr',
    statParents: 'of parents say boards are easier to manage',
    statLangs: 'languages supported (EN & AR)',
    statAccess: 'access from any device',
    learnMore: 'Learn more',
    pricingEyebrow: 'Pricing',
    pricingHeading: 'Flexible plans for your family',
    pricingIntro:
      'Compare options below — open the full pricing page for yearly billing and plans.',
    pricingViewFull: 'Full pricing details',
    pricingPlans: [
      { id: 'free-plan', name: 'Free', price: '$0', blurb: 'Try Jisr with a starter board.' },
      { id: 'family-plan', name: 'Family', price: '$15/mo', blurb: 'Unlimited vocabulary and analytics.' },
      { id: 'family-plus-plan', name: 'Family Plus', price: '$25/mo', blurb: 'Multiple child profiles.' },
    ] as const,
    testimonials: testimonialsEn,
    features: featuresEn,
    steps: stepsEn,
    audiences: audiencesEn,
    statsVals: statsValsEn,
  }
}

const featuresEn = [
  {
    title: 'Natural text-to-speech',
    description:
      'Tap symbols to build sentences and let Jisr speak them aloud in clear, friendly voices.',
  },
  {
    title: 'English & Arabic',
    description: 'Built for bilingual families with full Arabic RTL support and dual-language vocabulary.',
  },
  {
    title: 'Custom vocabulary',
    description: 'Add words and pictures that matter to your child. Organize by category, level, or context.',
  },
  {
    title: 'Real progress insights',
    description: 'See trends in usage, most-used words, and growth over time — without spreadsheets.',
  },
  {
    title: 'Child-first design',
    description: 'Big tap targets, calm colors, simple navigation. Designed with therapists, tested with kids.',
  },
  {
    title: 'Private & secure',
    description: 'Family data stays in your account with role-based access for parents, kids, and admins.',
  },
]

const featuresAr = [
  {
    title: 'تحويل النص إلى كلام طبيعي',
    description: 'البناء الجمل بواسطة الرموز ويجري جسر قراءتها بصوت واضح وودود.',
  },
  {
    title: 'إنجليزي وعربي',
    description: 'للعائلات ثنائية اللغة مع دعم العربية من اليمين لليسار ومفردات ثنائية.',
  },
  {
    title: 'مفردات مخصصة',
    description: 'أضف كلمات وصوراً تهم طفلك. نظّم حسب الفئة أو المستوى أو السياق.',
  },
  {
    title: 'رؤى حقيقية للتقدّم',
    description: 'تتبّع أنماط الاستخدام وأكثر الكلمات استخداماً والنمو مع الوقت دون جداول.',
  },
  {
    title: 'تصميم للطفل أولاً',
    description: 'أهداف لمس كبيرة، ألوان هادئة، تنقل بسيط. صُمم مع المعالجين واختبر مع الأطفال.',
  },
  {
    title: 'خصوصية وأمان',
    description: 'بيانات العائلة تبقى في حسابك مع صلاحيات للوالدين والأطفال والمدراء.',
  },
]

const stepsEn = [
  {
    title: 'Build the board',
    description: 'Add cards, pick images, organize categories the way your child thinks.',
  },
  {
    title: 'Tap to talk',
    description: 'Children chain symbols into sentences and hear them spoken instantly.',
  },
  {
    title: 'Track and adapt',
    description: 'See usage analytics and adjust vocabulary based on real communication.',
  },
]

const stepsAr = [
  {
    title: 'ابنِ اللوحة',
    description: 'أضف بطاقات واختَر الصور ونظم الفئات كما يفكر طفلك.',
  },
  {
    title: 'اضغط للحديث',
    description: 'يربط الطفل الرموز في جمل ويسمعها على الفور.',
  },
  {
    title: 'راقب وتكيّف',
    description: 'اطّلع على تحليلات الاستخدام وعدّل المفردات حسب التواصل الفعلي.',
  },
]

const audiencesEn = [
  {
    title: 'Parents',
    blurb: 'A friendly tool to support your child every day, at home and on the go.',
    href: '/signup?role=parent',
  },
  {
    title: 'Therapists',
    blurb: 'Customize boards per session, track outcomes, and share progress with families.',
    href: '/signup?role=therapist',
  },
  {
    title: 'Schools',
    blurb: 'Equip classrooms and SLPs with a shared AAC platform built for inclusion.',
    href: '/pricing',
  },
]

const audiencesAr = [
  {
    title: 'الوالدان',
    blurb: 'أداة بسيطة لدعم طفلك يومياً في المنزل وأثناء التنقل.',
    href: '/signup?role=parent',
  },
  {
    title: 'المعالجون',
    blurb: 'خصّص اللوحات لكل جلسة، تابع النتائج، وشارك التقدم مع العائلات.',
    href: '/signup?role=therapist',
  },
  {
    title: 'المدارس',
    blurb: 'جهّز الفصول ومختصي النطق بمنصة مشتركة مدمجة للجميع.',
    href: '/pricing',
  },
]

const testimonialsEn = [
  {
    name: 'Sarah J.',
    role: 'Parent of a 6-year-old',
    quote:
      'Jisr has given my daughter a voice. She can now express her needs and feelings independently — it has been life-changing.',
  },
  {
    name: 'Dr. Michael Chen',
    role: 'Speech-language pathologist',
    quote:
      'Customizing vocabulary per child is effortless, and the analytics give me a clear picture of progress between sessions.',
  },
  {
    name: 'Emma R.',
    role: 'Special education teacher',
    quote:
      'My students love using Jisr. It is so intuitive that even non-verbal children can use it independently.',
  },
]

const testimonialsAr = [
  {
    name: 'سارة ج.',
    role: 'والدة طفلة 6 أعوام',
    quote:
      'منح جسر ابنتي صوتاً. يمكنها الآن التعبير عن احتياجاتها ومشاعرها بمفردها — تغيير كبير في حياتنا.',
  },
  {
    name: 'د. مايكل تشن',
    role: 'أخصائي نطق ولغة',
    quote:
      'تخصيص المفردات لكل طفل سهل جداً، والتحليلات تعطيني صورة واضحة للتقدم بين الجلسات.',
  },
  {
    name: 'إيما ر.',
    role: 'معلمة تربية خاصة',
    quote:
      'طلابي يحبون استخدام جسر. بديهية لدرجة أن حتى غير المنطقيين لفظياً يستخدمونها بمفردهم.',
  },
]

const statsValsEn = [
  { value: '12k+', suffixKey: 'words' as const },
  { value: '98%', suffixKey: 'parents' as const },
  { value: '2', suffixKey: 'langs' as const },
  { value: '24/7', suffixKey: 'access' as const },
]

const statsValsAr = statsValsEn
