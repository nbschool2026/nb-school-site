export const SITE_URL = 'https://nbosvita.cn.ua';
export const SCHOOL_NAME = 'Новобілоуський ліцей';

export const SEO_PAGES = {
  '/': {
    title: 'Новобілоуський ліцей | Школа в с. Новий Білоус',
    description: 'Новобілоуський ліцей Новобілоуської сільської ради — школа в селі Новий Білоус Чернігівського району. Новини, розклад, навчання та контакти.',
    heading: 'Новобілоуський ліцей',
    intro: 'Новобілоуський ліцей Новобілоуської сільської ради — заклад освіти в селі Новий Білоус Чернігівського району Чернігівської області. На сайті є новини, розклад уроків, матеріали дистанційного навчання та контакти школи.',
    en: { title: 'Novobilouskyi Lyceum | School in Novyi Bilous', description: 'Novobilouskyi Lyceum in Novyi Bilous, Chernihiv region. School news, class schedule, distance learning and contact information.' },
  },
  '/about': {
    title: 'Про ліцей | Новобілоуський ліцей',
    description: 'Історія Новобілоуського ліцею в селі Новий Білоус, цінності школи, вчителі та адміністрація.',
    heading: 'Про Новобілоуський ліцей',
    intro: 'Дізнайтеся про історію, цінності та колектив Новобілоуського ліцею в селі Новий Білоус Чернігівського району.',
    en: { title: 'About | Novobilouskyi Lyceum', description: 'Learn about the history, values, teachers and administration of Novobilouskyi Lyceum in Novyi Bilous.' },
  },
  '/events': {
    title: 'Новини та події | Новобілоуський ліцей',
    description: 'Новини, заходи, конкурси, спортивні змагання та культурне життя Новобілоуського ліцею.',
    heading: 'Новини та події ліцею',
    intro: 'Новини Новобілоуського ліцею: шкільні заходи, конкурси, спортивні змагання та події громади.',
    en: { title: 'News and events | Novobilouskyi Lyceum', description: 'News, activities, competitions, sports and community events at Novobilouskyi Lyceum.' },
  },
  '/schedule': {
    title: 'Розклад уроків | Новобілоуський ліцей',
    description: 'Розклад занять Новобілоуського ліцею за класами й днями тижня. Знайдіть уроки та вчителів.',
    heading: 'Розклад уроків',
    intro: 'Актуальний розклад уроків Новобілоуського ліцею за класами та днями тижня.',
    en: { title: 'Class schedule | Novobilouskyi Lyceum', description: 'Class schedule at Novobilouskyi Lyceum by grade and weekday.' },
  },
  '/public-info': {
    title: 'Публічна інформація | Новобілоуський ліцей',
    description: 'Офіційні документи, публічна інформація та звітність Новобілоуського ліцею Новобілоуської сільської ради.',
    heading: 'Публічна інформація',
    intro: 'Офіційні документи та звітність Новобілоуського ліцею Новобілоуської сільської ради.',
    en: { title: 'Public information | Novobilouskyi Lyceum', description: 'Official documents, public information and reports from Novobilouskyi Lyceum.' },
  },
  '/distance-learning': {
    title: 'Дистанційне навчання | Новобілоуський ліцей',
    description: 'Матеріали дистанційного навчання, теми та завдання для учнів Новобілоуського ліцею за класами й предметами.',
    heading: 'Дистанційне навчання',
    intro: 'Матеріали, теми та завдання дистанційного навчання для учнів Новобілоуського ліцею.',
    en: { title: 'Distance learning | Novobilouskyi Lyceum', description: 'Distance learning resources and assignments for students at Novobilouskyi Lyceum.' },
  },
  '/power': {
    title: 'Електропостачання школи | Новобілоуський ліцей',
    description: 'Поточний стан електромережі та сонячної станції Новобілоуського ліцею.',
    heading: 'Електропостачання школи',
    intro: 'Інформація про стан електромережі та сонячної станції Новобілоуського ліцею.',
    en: { title: 'School power status | Novobilouskyi Lyceum', description: 'Current grid and solar power status at Novobilouskyi Lyceum.' },
  },
};

export const NAV_PAGES = ['/', '/about', '/events', '/schedule', '/public-info', '/distance-learning'];

export function canonicalUrl(path) {
  return `${SITE_URL}${path === '/' ? '/' : path.replace(/\/$/, '')}`;
}

export function schoolSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    '@id': `${SITE_URL}/#school`,
    name: SCHOOL_NAME,
    alternateName: ['Новобілоуська школа', 'Новобілоуський ліцей Новобілоуської сільської ради'],
    url: `${SITE_URL}/`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'вул. Троїцька, 3 А',
      addressLocality: 'с. Новий Білоус',
      addressRegion: 'Чернігівська область',
      postalCode: '15501',
      addressCountry: 'UA',
    },
  };
}
