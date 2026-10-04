# React-сайт

Це публічна частина сайту Новобілоуського ліцею: React 18, Vite 5 і React Router 6.

Маршрути: `/`, `/about`, `/events`, `/public-info`. Запити до Strapi зібрані в `src/lib/api.js`; початкові дані для розробки зберігаються окремо у `src/lib/fallbackData.js`. За замовчуванням сайт звертається до `/api` та `/uploads` на своєму хості; Vite проксіює їх до Strapi на `127.0.0.1:1337`. Це працює і при відкритті сайту через IP комп'ютера в локальній мережі. Для іншої адреси задайте `VITE_STRAPI_API_URL`. У production потрібен такий самий проксі або доступний браузеру URL API.

Запуск у PowerShell із кореня клону:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Сайт відкривається на <http://localhost:5174/>. Повна інструкція та стан функцій: [локальна розробка](../docs/local-development.md), [архітектура](../docs/architecture.md), [дорожня карта](../docs/roadmap.md).
