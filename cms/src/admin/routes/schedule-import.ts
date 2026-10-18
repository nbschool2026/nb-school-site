export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/schedule-lessons/import',
      handler: 'api::schedule-lesson.schedule-lesson.import',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/schedule-lessons/export',
      handler: 'api::schedule-lesson.schedule-lesson.export',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
