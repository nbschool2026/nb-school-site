const localizedContentTypes = [
  'api::event.event',
  'api::gallery-item.gallery-item',
  'api::history-item.history-item',
  'api::public-document.public-document',
  'api::schedule-lesson.schedule-lesson',
  'api::school-profile.school-profile',
  'api::staff-member.staff-member',
  'api::value-card.value-card',
];

export async function ensureContentLocales(strapi: any) {
  const locales = strapi.plugin('i18n').service('locales');
  const migration = strapi.store({ type: 'core', name: 'school_site' });
  if (!(await locales.findByCode('uk'))) {
    await locales.create({ name: 'Ukrainian (uk)', code: 'uk' });
  }
  if (!(await locales.findByCode('en'))) {
    await locales.create({ name: 'English (en)', code: 'en' });
  }
  if ((await locales.getDefaultLocale()) !== 'uk') {
    await locales.setDefaultLocale({ code: 'uk' });
  }

  // Strapi assigns its former default `en` to records when i18n is first
  // enabled. All content created before this migration is Ukrainian.
  if (!(await migration.get({ key: 'i18n_migration_v1' }))) {
    for (const uid of localizedContentTypes) {
      await strapi.db.query(uid).updateMany({
        where: { locale: 'en' },
        data: { locale: 'uk' },
      });
      await strapi.db.query(uid).updateMany({
        where: { locale: { $null: true } },
        data: { locale: 'uk' },
      });
    }
    await migration.set({ key: 'i18n_migration_v1', value: true });
  }
}
