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
    category: 'Категорія',
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
  'api::distance-learning-material.distance-learning-material': {
    grade: 'Клас', subject: 'Предмет', date: 'Дата', topic: 'Тема', content: 'Завдання',
    videoUrl: 'Відео', sourceUrl: 'Посилання на джерело', order: 'Порядок',
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
    aboutImage: 'Фото сторінки «Про нас»',
    aboutHeroImages: 'Слайдер hero «Про нас» (до 20 фото)',
    distanceLearningImage: 'Hero дистанційного навчання',
    distanceLearningTextColor: 'Колір тексту hero дистанційного навчання',
  },
  'api::staff-member.staff-member': {
    name: 'ПІБ',
    position: 'Посада',
    bio: 'Опис',
    photo: 'Фото',
    homepagePhoto: 'Фото для головної',
    order: 'Порядок',
  },
  'api::value-card.value-card': {
    title: 'Назва',
    text: 'Опис',
    icon: 'Іконка',
    order: 'Порядок',
  },
};

const descriptions: Record<string, Record<string, string>> = {
  'api::history-item.history-item': {
    icon: 'Назва іконки Material Symbols латиницею. Символ _ є частиною назви, наприклад history_edu. Каталог: https://fonts.google.com/icons',
  },
  'api::value-card.value-card': {
    icon: 'Назва іконки Material Symbols латиницею. Символ _ є частиною назви, наприклад workspace_premium. Каталог: https://fonts.google.com/icons',
  },
  'api::public-document.public-document': {
    icon: 'Назва іконки Material Symbols латиницею. Символ _ є частиною назви, наприклад description. Каталог: https://fonts.google.com/icons',
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

    const fieldDescriptions = descriptions[uid];
    if (!fieldDescriptions) continue;

    let descriptionsChanged = false;
    for (const [field, description] of Object.entries(fieldDescriptions)) {
      const metadata = configuration.metadatas?.[field];
      if (!metadata?.edit) continue;
      if (metadata.edit.description !== description) {
        metadata.edit.description = description;
        descriptionsChanged = true;
      }
    }
    if (descriptionsChanged) await service.updateConfiguration(contentType, configuration);
  }
}
