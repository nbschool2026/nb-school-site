# Strapi CMS

Це backend та адмінка Strapi 5 для сайту Новобілоуського ліцею. Локальна база — SQLite у `.tmp/data.db`.

Запуск у PowerShell із кореня клону після створення `.env`:

```powershell
cd cms
npm.cmd install
npm.cmd run build
npm.cmd run develop
```

Адмінка: <http://localhost:1337/admin>. API: <http://localhost:1337/api>. Для першого входу створіть локального адміністратора.

Файл `.env` і база `.tmp/data.db` ігноруються Git. Схеми контенту містяться в `src/api/*/content-types/*/schema.json`; стартові демонстраційні записи й налаштування публічного читання — у `src/index.ts`.

Див. [інструкцію з локальної розробки](../docs/local-development.md) і [довідник контенту](../docs/content-management.md).
