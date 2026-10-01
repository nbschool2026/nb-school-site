# Знімок бази CMS у Git і відновлення

У цьому репозиторії `backups/cms-content.db` — знімок локальної SQLite-бази з демонстраційним вмістом. Пов'язані фото зберігаються у `cms/public/uploads/` і мають бути в тому самому коміті. Знімок не містить локального адміністратора, сесій, API-токенів і налаштувань, які можуть містити секрети. `cms/.env` також не зберігається в Git.

Це **знімок для відтворення демонстраційного вмісту**, а не автоматичне резервування робочої CMS. Публікація коду на GitHub сама по собі не оновить базу сервера. Перед першим публічним релізом перевірте вміст подій і права на фото; записи «ДЕМО» не є підтвердженими новинами ліцею.

## Відновлення в новому клоні

Потрібні Node.js 22 і код того самого коміту, що містить знімок. У PowerShell відкрийте **корінь репозиторію**:

```powershell
New-Item -ItemType Directory -Force .\cms\.tmp | Out-Null
Copy-Item -LiteralPath .\backups\cms-content.db -Destination .\cms\.tmp\data.db
Copy-Item -LiteralPath .\cms\.env.example -Destination .\cms\.env
```

У `cms/.env` замініть усі демонстраційні секрети власними випадковими значеннями. Не перезаписуйте вже налаштований `.env`. Файли `cms/public/uploads/` приходять із цього ж коміту Git, тому окремо копіювати їх у новому клоні не потрібно.

Запустіть CMS:

```powershell
cd cms
npm.cmd install
npm.cmd run build
npm.cmd run develop
```

Відкрийте <http://localhost:1337/admin> і створіть **нового** адміністратора. Обліковий запис зі старої локальної бази навмисно не входить до знімка. Перевірте список подій на <http://localhost:1337/api/events> і фото на сайті.

## Відновлення поверх наявної локальної CMS

1. Зупиніть Strapi через `Ctrl+C`. Відновлення замінить поточну локальну базу, включно з її адмінами та всіма змінами контенту після створення знімка.
2. У корені репозиторію збережіть поточну базу й фото **поза репозиторієм**:

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$safetyCopy = Join-Path (Split-Path (Get-Location) -Parent) "nb-school-before-restore-$stamp"
New-Item -ItemType Directory -Force $safetyCopy | Out-Null
if (Test-Path -LiteralPath .\cms\.tmp\data.db) {
    Copy-Item -LiteralPath .\cms\.tmp\data.db -Destination (Join-Path $safetyCopy 'data.db')
}
Copy-Item -LiteralPath .\cms\public\uploads -Destination $safetyCopy -Recurse
```

3. Скопіюйте знімок і запустіть CMS знову:

```powershell
New-Item -ItemType Directory -Force .\cms\.tmp | Out-Null
Copy-Item -LiteralPath .\backups\cms-content.db -Destination .\cms\.tmp\data.db -Force
cd cms
npm.cmd run develop
```

4. Створіть нового адміністратора в адмінці. Перевірте події та фото. Відновлення не змінює `cms/.env`.

Якщо потрібно повернути стан **до** відновлення, зупиніть CMS, скопіюйте `$safetyCopy\data.db` назад у `cms/.tmp/data.db` та файли з `$safetyCopy\uploads` назад у `cms/public/uploads/`, після чого запустіть CMS. Ці дії виконуються з кореня репозиторію.

## Оновлення знімка в Git

Після змін у CMS потрібен Python 3. З кореня репозиторію виконайте:

```powershell
python .\scripts\create-content-snapshot.py
git status --short
```

Скрипт створює узгоджену копію навіть коли Strapi працює, не змінює `cms/.tmp/data.db`, видаляє облікові записи, сесії, токени й потенційно секретні налаштування. Він зупиниться, якщо в новій версії Strapi з'явиться невідома таблиця або бракує завантаженого файла. У такому разі спочатку перевірте нову таблицю та оновіть список у скрипті.

Знімок також зберігає коди локалей `uk`/`en`, переклади та маркер одноразової міграції i18n. Відновлюйте базу лише з кодом того самого коміту: це збереже переклади та не позначить їх помилково українськими після запуску.

Перегляньте записи й медіафайли перед комітом, особливо персональні дані та права на фото. Додавайте **лише** знімок, потрібні завантаження, скрипт і документацію; `cms/.tmp/data.db` та `cms/.env` залишаються поза Git:

```powershell
git add backups/cms-content.db cms/public/uploads scripts/create-content-snapshot.py docs/database-backup.md
git diff --cached --stat
git commit -m "Save CMS content snapshot"
```

Одна версія вмісту — це один Git-коміт з `backups/cms-content.db` та відповідними фото. Для відновлення старішої версії спочатку відкрийте її коміт або тег в окремому клоні, а потім виконайте кроки відновлення звідти. Не перезаписуйте робочу базу сайту таким знімком після запуску сайту для користувачів: нові записи редакторів буде втрачено. Для робочого сайту потрібні окремі регулярні резервні копії бази й медіафайлів.
