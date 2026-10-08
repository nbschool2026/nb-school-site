export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/schedule-lessons/import',
      handler: 'schedule-lesson.import',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
