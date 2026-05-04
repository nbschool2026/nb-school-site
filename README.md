# Новобілоуський ліцей

У кореневій папці `ua` зараз є стара статична версія сайту та дві нові робочі частини проєкту:

- `cms` - backend і адмінка на Strapi.
- `frontend` - новий сайт на React, Vite і React Router.

Старі файли `index.html`, `about.html`, `events.html`, `public-info.html`, папки `image` і `js` залишені в корені як попередня статична версія сайту.

## Папка `cms`

`cms` - це Strapi CMS для керування контентом сайту.

Що всередині:

- адмінка Strapi;
- REST API для frontend;
- SQLite база даних у `cms/.tmp/data.db`;
- моделі даних для подій, публічної інформації, документів, розкладу, співробітників, історії, цінностей, галереї та профілю школи;
- стартові demo-дані;
- публічні read permissions, щоб React frontend міг читати опублікований контент.

Локальний запуск:

```bash
cd cms
nvm use 24.15.0
npm install
npm run build
npm run start
```

Адмінка буде доступна за адресою:

```text
http://localhost:1337/admin
```

API буде доступне за адресою:

```text
http://localhost:1337/api
```

Докладніше про CMS: `cms/README.md`.

## Папка `frontend`

`frontend` - це нова React-версія сайту.

Що всередині:

- Vite;
- React;
- React Router;
- маршрути `/`, `/about`, `/events`, `/public-info`;
- клієнт для завантаження даних зі Strapi API;
- fallback-контент на випадок, якщо Strapi зараз не запущений.

Локальний запуск:

```bash
cd frontend
nvm use 24.15.0
npm install
npm run dev
```

Frontend буде доступний за адресою:

```text
http://localhost:5174/
```

Докладніше про frontend: `frontend/README.md`.

## Як це пов'язано

Якщо Strapi запущений на `http://localhost:1337`, frontend братиме дані з CMS.

Якщо Strapi вимкнений або API недоступне, сайт не падає і показує fallback-контент з `frontend/src/lib/fallbackData.js`.

За замовчуванням frontend звертається до API:

```text
http://localhost:1337/api
```

Якщо backend буде запущений на іншій адресі, її можна вказати через змінну оточення:

```bash
VITE_STRAPI_API_URL=http://your-host:1337/api npm run dev
```
