export const schoolProfile = {
  schoolName: 'Новобілоуський ліцей',
  heroTitle: 'Ласкаво просимо до Новобілоуського ліцею',
  heroSubtitle: 'Розширюємо можливості наступного покоління за допомогою якісної освіти для світлого та сталого майбутнього.',
  mission: 'Наша місія — створення сучасного освітнього простору для всебічного розвитку особистості, плекання патріотизму та прагнення до знань.',
  address: '15501, Чернігівська область, Чернігівський район, с. Новий Білоус, вул. Троїцька, 3 А',
  phone: '+380 (44) 123-4567',
  email: 'bilousnew@ukr.net',
  workingHours: 'Пн - Пт: 8:00 - 17:00',
  mapUrl: 'https://maps.app.goo.gl/eh5ZCAyBr3FVmDbz8',
};

export const publicDocuments = [
  {
    id: 1,
    title: 'Статут закладу освіти',
    slug: 'school-charter',
    description: 'Установчий документ, що визначає правові засади діяльності навчального закладу.',
    type: 'pdf',
    icon: 'description',
    order: 10,
  },
  {
    id: 2,
    title: 'Структура та органи управління',
    slug: 'management-structure',
    description: 'Інформація про адміністрацію, педагогічну раду та органи самоврядування.',
    type: 'page',
    icon: 'account_balance',
    order: 20,
  },
  {
    id: 3,
    title: 'Кадровий склад',
    slug: 'staff',
    description: 'Відомості про кваліфікацію, освіту та педагогічний стаж працівників.',
    type: 'page',
    icon: 'groups',
    order: 30,
  },
  {
    id: 4,
    title: 'Фінансова звітність',
    slug: 'financial-reports',
    description: 'Кошторис, фінансові звіти та інформація про використання коштів.',
    type: 'pdf',
    icon: 'payments',
    order: 40,
  },
];

export const historyItems = [
  { id: 1, year: '1985 рік', title: 'Заснування школи', text: 'Початок формування педагогічних традицій.', icon: 'history_edu', order: 10 },
  { id: 2, year: '2010 рік', title: 'Реконструкція', text: 'Оновлення матеріально-технічної бази та відкриття нових кабінетів.', icon: 'architecture', order: 20 },
  { id: 3, year: '2021 рік', title: 'Статус ліцею', text: 'Перехід на нові стандарти профільної освіти.', icon: 'verified', order: 30 },
];

export const valueCards = [
  { id: 1, title: 'Досконалість', text: 'Прагнемо до найвищих результатів у навчанні та вихованні.', icon: 'workspace_premium', order: 10 },
  { id: 2, title: 'Спільнота', text: 'Створюємо атмосферу взаємопідтримки та поваги.', icon: 'groups', order: 20 },
  { id: 3, title: 'Інновації', text: 'Впроваджуємо сучасні методики та технології.', icon: 'lightbulb', order: 30 },
];

export const staffMembers = [
  { id: 1, name: 'Ракута Вікторія Миколаївна', position: 'Шкільний директор', bio: 'Керує розвитком ліцею та освітнього середовища.', order: 10 },
  { id: 2, name: 'Ігор Сидоренко', position: 'Заступник з навчальної роботи', order: 20 },
  { id: 3, name: 'Марія Іванова', position: 'Заступник з виховної роботи', order: 30 },
];

export const scheduleLessons = [
  { id: 1, className: '11 Клас', weekday: 'monday', startTime: '08:30:00', endTime: '09:15:00', subject: 'Математика', teacher: 'Іван Іванов', order: 10 },
  { id: 2, className: '11 Клас', weekday: 'monday', startTime: '09:25:00', endTime: '10:10:00', subject: 'Фізика', teacher: 'Олена Кравченко', order: 20 },
  { id: 3, className: '11 Клас', weekday: 'tuesday', startTime: '08:30:00', endTime: '09:15:00', subject: 'Історія', teacher: 'Микола Сидоренко', order: 30 },
  { id: 4, className: '11 Клас', weekday: 'wednesday', startTime: '08:30:00', endTime: '09:15:00', subject: 'Англійська', teacher: 'Анна Коваль', order: 40 },
  { id: 5, className: '11 Клас', weekday: 'thursday', startTime: '08:30:00', endTime: '09:15:00', subject: 'Фізкультура', teacher: 'Олег Петров', order: 50 },
  { id: 6, className: '11 Клас', weekday: 'friday', startTime: '08:30:00', endTime: '09:15:00', subject: 'Біологія', teacher: 'Юлія Лисак', order: 60 },
];
