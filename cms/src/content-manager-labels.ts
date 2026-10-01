const labels: Record<string, Record<string, string>> = {
  'api::event.event': {
    title: 'Назва',
    slug: 'Адреса сторінки',
    summary: 'Короткий опис',
    content: 'Повний опис',
    category: 'Категорія',
    date: 'Дата події',
    cover: 'Обкладинка',
    photos: 'Фотографії',
    youtubeUrl: 'Посилання YouTube',
    featured: 'Рекомендована подія',
  },
  'api::gallery-item.gallery-item': {
    title: 'Назва',
    image: 'Фото',
    alt: 'Опис фото',
    order: 'Порядок',
  },
  'api::history-item.history-item': {
    year: 'Рік',
    title: 'Назва',
    text: 'Опис',
    icon: 'Іконка',
    order: 'Порядок',
  },
  'api::public-document.public-document': {
    title: 'Назва',
    slug: 'Адреса сторінки',
    description: 'Опис',
    type: 'Тип',
    icon: 'Іконка',
    url: 'Посилання',
    file: 'Файл',
    order: 'Порядок',
  },
  'api::schedule-lesson.schedule-lesson': {
    className: 'Клас',
    weekday: 'День тижня',
    startTime: 'Час початку',
    endTime: 'Час завершення',
    subject: 'Предмет',
    teacher: 'Учитель',
    room: 'Кабінет',
    order: 'Порядок',
  },
  'api::school-profile.school-profile': {
    schoolName: 'Назва ліцею',
    heroTitle: 'Заголовок головної',
    heroSubtitle: 'Підзаголовок головної',
    mission: 'Місія',
    address: 'Адреса',
    phone: 'Телефон',
    email: 'Електронна пошта',
    workingHours: 'Графік роботи',
    mapUrl: 'Посилання на карту',
    heroImage: 'Головне фото',
  },
  'api::staff-member.staff-member': {
    name: 'ПІБ',
    position: 'Посада',
    bio: 'Опис',
    photo: 'Фото',
    order: 'Порядок',
  },
  'api::value-card.value-card': {
    title: 'Назва',
    text: 'Опис',
    icon: 'Іконка',
    order: 'Порядок',
  },
};

export async function ensureUkrainianContentManagerLabels(strapi: any) {
  const service = strapi.plugin('content-manager')?.service('content-types');
  if (!service) return;

  for (const [uid, fieldLabels] of Object.entries(labels)) {
    const contentType = strapi.contentTypes[uid];
    if (!contentType) continue;

    const configuration = await service.findConfiguration(contentType);
    let changed = false;
    for (const [field, label] of Object.entries(fieldLabels)) {
      const metadata = configuration.metadatas?.[field];
      if (!metadata) continue;
      for (const view of ['edit', 'list']) {
        const current = metadata[view]?.label;
        if (current === field || !current) {
          metadata[view].label = label;
          changed = true;
        }
      }
    }
    if (changed) await service.updateConfiguration(contentType, configuration);
  }
}
