export default {
  type: 'admin',
  routes: [
    {
      method: 'DELETE',
      path: '/schedule-lessons/:documentId',
      handler: 'api::schedule-lesson.schedule-lesson.deleteLesson',
      config: {
        auth: false,
        policies: [],
      },
    },
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
    {
      method: 'GET',
      path: '/schedule-lessons/auth-status',
      handler: 'api::schedule-lesson.schedule-lesson.authStatus',
      config: {
        auth: false,
        policies: [],
      },
    },
  ],
};
