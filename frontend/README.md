# React-сайт

Це публічна частина сайту Новобілоуського ліцею: React 18, Vite 5 і React Router 6.

Маршрути: `/`, `/about`, `/events`, `/public-info`. Запити до Strapi зібрані в `src/lib/api.js`, а демонстраційні дані — у `src/lib/fallbackData.js`. За замовчуванням API доступне за `http://localhost:1337/api`; для іншої адреси задайте `VITE_STRAPI_API_URL`.

Запуск у PowerShell із кореня клону:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Сайт відкривається на <http://localhost:5174/>. Повна інструкція та стан функцій: [локальна розробка](../docs/local-development.md), [архітектура](../docs/architecture.md), [дорожня карта](../docs/roadmap.md).
