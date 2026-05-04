export default {
  register() {},

  async bootstrap({ strapi }) {
    await seedCollection(strapi, 'api::event.event', events);
    await seedCollection(strapi, 'api::public-document.public-document', publicDocuments);
    await seedCollection(strapi, 'api::staff-member.staff-member', staffMembers);
    await seedCollection(strapi, 'api::schedule-lesson.schedule-lesson', scheduleLessons);
    await seedCollection(strapi, 'api::history-item.history-item', historyItems);
    await seedCollection(strapi, 'api::value-card.value-card', valueCards);
    await seedSingleType(strapi, 'api::school-profile.school-profile', schoolProfile);
    await ensurePublicReadPermissions(strapi);
  },
};

async function seedCollection(strapi, uid: string, records: Record<string, unknown>[]) {
  const count = await strapi.db.query(uid).count();
  if (count > 0) return;

  for (const data of records) {
    await strapi.db.query(uid).create({ data });
  }
}

async function seedSingleType(strapi, uid: string, data: Record<string, unknown>) {
  const existing = await strapi.db.query(uid).findOne();
  if (existing) return;

  await strapi.db.query(uid).create({ data });
}

async function ensurePublicReadPermissions(strapi) {
  const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });

  if (!publicRole) return;

  const actions = [
    ...readActions('api::event.event'),
    ...readActions('api::public-document.public-document'),
    ...readActions('api::staff-member.staff-member'),
    ...readActions('api::schedule-lesson.schedule-lesson'),
    ...readActions('api::history-item.history-item'),
    ...readActions('api::value-card.value-card'),
    ...readActions('api::gallery-item.gallery-item'),
    'api::school-profile.school-profile.find',
  ];

  for (const action of actions) {
    const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
      where: {
        action,
        role: publicRole.id,
      },
    });

    if (existing) continue;

    await strapi.db.query('plugin::users-permissions.permission').create({
      data: {
        action,
        role: publicRole.id,
      },
    });
  }
}

function readActions(uid: string) {
  return [`${uid}.find`, `${uid}.findOne`];
}

const schoolProfile = {
  schoolName: 'Новобілоуський ліцей',
  heroTitle: 'Ласкаво просимо до Новобілоуського ліцею',
  heroSubtitle: 'Розширюємо можливості наступного покоління за допомогою якісної освіти для світлого та сталого майбутнього.',
  mission: 'Створення сучасного освітнього простору для всебічного розвитку особистості, плекання патріотизму та прагнення до знань.',
  address: '15501, Чернігівська область, Чернігівський район, с. Новий Білоус, вул. Троїцька, 3 А',
  phone: '+380 (44) 123-4567',
  email: 'bilousnew@ukr.net',
  workingHours: 'Пн - Пт: 8:00 - 17:00',
  mapUrl: 'https://maps.app.goo.gl/eh5ZCAyBr3FVmDbz8',
};

const events = [
  {
    title: 'Щорічна олімпіада з математики 2026',
    slug: 'math-olympiad-2026',
    category: 'academic',
    date: '2026-03-15',
    summary: 'Учні ліцею змагатимуться у розв’язанні нестандартних математичних задач.',
    featured: true,
  },
  {
    title: 'Обласний чемпіонат з баскетболу 2026',
    slug: 'basketball-championship-2026',
    category: 'sport',
    date: '2026-04-10',
    summary: 'Підтримайте команду ліцею у спортивних змаганнях серед шкіл області.',
    featured: true,
  },
  {
    title: 'Виставка робіт молодших класів',
    slug: 'junior-art-exhibition-2026',
    category: 'art',
    date: '2026-05-05',
    summary: 'Творчі роботи учнів молодших класів у шкільній галереї.',
    featured: true,
  },
  {
    title: 'День відкритих дверей 2026',
    slug: 'open-day-2026',
    category: 'admission',
    date: '2026-06-01',
    summary: 'Знайомство з освітніми програмами, адміністрацією та умовами навчання.',
    featured: true,
  },
];

const publicDocuments = [
  {
    title: 'Статут закладу освіти',
    slug: 'school-charter',
    description: 'Установчий документ, що визначає правові засади діяльності навчального закладу.',
    type: 'pdf',
    icon: 'description',
    order: 10,
  },
  {
    title: 'Структура та органи управління',
    slug: 'management-structure',
    description: 'Інформація про адміністрацію, педагогічну раду та органи самоврядування.',
    type: 'page',
    icon: 'account_balance',
    order: 20,
  },
  {
    title: 'Кадровий склад',
    slug: 'staff',
    description: 'Відомості про кваліфікацію, освіту та педагогічний стаж працівників.',
    type: 'page',
    icon: 'groups',
    order: 30,
  },
  {
    title: 'Фінансова звітність',
    slug: 'financial-reports',
    description: 'Кошторис, фінансові звіти та інформація про використання коштів.',
    type: 'pdf',
    icon: 'payments',
    order: 40,
  },
];

const staffMembers = [
  {
    name: 'Ракута Вікторія Миколаївна',
    position: 'Шкільний директор',
    bio: 'Керує розвитком ліцею та освітнього середовища.',
    order: 10,
  },
  {
    name: 'Ігор Сидоренко',
    position: 'Заступник з навчальної роботи',
    order: 20,
  },
  {
    name: 'Марія Іванова',
    position: 'Заступник з виховної роботи',
    order: 30,
  },
];

const scheduleLessons = [
  { className: '11 Клас', weekday: 'monday', startTime: '08:30:00', endTime: '09:15:00', subject: 'Математика', teacher: 'Іван Іванов', order: 10 },
  { className: '11 Клас', weekday: 'monday', startTime: '09:25:00', endTime: '10:10:00', subject: 'Фізика', teacher: 'Олена Кравченко', order: 20 },
  { className: '11 Клас', weekday: 'tuesday', startTime: '08:30:00', endTime: '09:15:00', subject: 'Історія', teacher: 'Микола Сидоренко', order: 30 },
  { className: '11 Клас', weekday: 'wednesday', startTime: '08:30:00', endTime: '09:15:00', subject: 'Англійська', teacher: 'Анна Коваль', order: 40 },
];

const historyItems = [
  { year: '1985 рік', title: 'Заснування школи', text: 'Початок формування педагогічних традицій.', icon: 'history_edu', order: 10 },
  { year: '2010 рік', title: 'Реконструкція', text: 'Оновлення матеріально-технічної бази та відкриття нових кабінетів.', icon: 'architecture', order: 20 },
  { year: '2021 рік', title: 'Статус ліцею', text: 'Перехід на нові стандарти профільної освіти.', icon: 'verified', order: 30 },
];

const valueCards = [
  { title: 'Досконалість', text: 'Прагнемо до найвищих результатів у навчанні та вихованні.', icon: 'workspace_premium', order: 10 },
  { title: 'Спільнота', text: 'Створюємо атмосферу взаємопідтримки та поваги.', icon: 'groups', order: 20 },
  { title: 'Інновації', text: 'Впроваджуємо сучасні методики та технології.', icon: 'lightbulb', order: 30 },
];
