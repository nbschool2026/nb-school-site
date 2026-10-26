export default {
  routes: [
    { method: 'GET', path: '/power/status', handler: 'power.status', config: { auth: false } },
  ],
};
