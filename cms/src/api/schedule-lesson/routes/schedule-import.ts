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
  ],
};
