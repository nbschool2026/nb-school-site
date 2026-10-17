# Codex handoff

## Проєкт

Новобілоуський ліцей: React frontend + Strapi CMS.

Remote: `https://github.com/nbschool2026/nb-school-site.git`

## Поточний стан

- About: hero-слайдер із фото з CMS, історія згортається, учителі завантажуються поступово.
- Distance learning та Events: YouTube/Facebook video embeds.
- Schedule: окрема сторінка `/schedule` з фільтрами класу, предмета та вчителя.
- Фільтри розкладу зберігаються в `localStorage`; якщо сховище порожнє, стартує 5 клас.
- При перегляді одного вчителя по всіх класах картка показує клас і приховує ПІБ учителя.
- Для цього режиму є чекбокс «Показати вікна», який вставляє порожні слоти між номерами уроків.
- API розкладу завантажується посторінково, щоб не втрачати записи після першої сторінки.
- CMS має пункт «Імпорт розкладу»: CSV повністю замінює старі записи та публікує нові.
- CMS більше не seed-ить тестовий розклад під час запуску.

## CSV

Шаблон: `cms/schedule-template.csv`.

Імпортер: `cms/scripts/import-schedule.cjs`.

Правила розбору зображення: `cms/SCHEDULE_IMPORT.md`.

## Деплой на сервер

```bash
cd /opt/nb-school-site
git pull --ff-only origin main

cd cms
npm run build
sudo systemctl daemon-reload
sudo systemctl restart nb-school-cms

cd ../frontend
npm run build
sudo systemctl reload caddy
```

## Git

```text
user.name: nbschool2026
user.email: nbschool2026@gmail.com
```

Якщо push повертає 403, треба повторно авторизувати GitHub CLI:

```powershell
gh auth logout -h github.com -u nbschool2026
gh auth login -h github.com
```
