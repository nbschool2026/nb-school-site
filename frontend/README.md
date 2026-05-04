# React frontend для сайту ліцею

Це окремий React/Vite frontend для сайту Новобілоуського ліцею.

## Запуск

```bash
nvm use 24.15.0
npm install
npm run dev
```

Frontend запускається на:

```text
http://localhost:5174/
```

## Зв'язок зі Strapi

Frontend читає CMS API зі Strapi за адресою:

```text
http://localhost:1337/api
```

Якщо Strapi запущений на `http://localhost:1337`, frontend буде брати події, публічні документи, розклад, профіль школи та інші дані з CMS.

Якщо Strapi вимкнений або API недоступний, сайт не ламається: React показує fallback-контент з файлу:

```text
src/lib/fallbackData.js
```

Це дозволяє розробляти і переглядати frontend навіть без запущеної адмінки Strapi.

## Маршрути

- `/` - головна сторінка
- `/about` - про ліцей
- `/events` - події
- `/public-info` - публічна інформація

## Налаштування API URL

За замовчуванням використовується `http://localhost:1337/api`.

Якщо backend буде на іншій адресі, можна задати змінну середовища:

```bash
VITE_STRAPI_API_URL=http://your-host:1337/api npm run dev
```
