# Доступ до відвідування

Іконка відвідування у підвалі сайту відкриває форму пароля. Фронтенд надсилає пароль до `POST /api/attendance/access`; CMS перевіряє його й повертає адресу папки лише після успішної перевірки. Після п'яти невдалих спроб з однієї IP-адреси CMS відповідає `429` протягом 15 хвилин.

На сервері задайте змінні середовища для служби `nb-school-cms`:

```ini
ATTENDANCE_PASSWORD=<пароль, який ви повідомите користувачам>
ATTENDANCE_DRIVE_URL=<повна адреса папки Google Диска>
```

Наприклад, створіть `/etc/nb-school-cms-attendance.env` з правами `600` і підключіть його через `EnvironmentFile=/etc/nb-school-cms-attendance.env` у секції `[Service]` файлу `/etc/systemd/system/nb-school-cms.service`. Потім виконайте `sudo systemctl daemon-reload` та `sudo systemctl restart nb-school-cms`.

Цей пароль обмежує перехід **із сайту**. Google Диск залишається доступним кожному, хто вже має пряму адресу папки. Не вважайте цей механізм захистом самих файлів.
