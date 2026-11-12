export default {
  routes: [
    { method: 'GET', path: '/power/status', handler: 'power.status', config: { auth: false } },
    { method: 'GET', path: '/power/history', handler: 'power.history', config: { auth: false } },
    { method: 'POST', path: '/attendance/access', handler: 'power.attendanceAccess', config: { auth: false } },
  ],
};
