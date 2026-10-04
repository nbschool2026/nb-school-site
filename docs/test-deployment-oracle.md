# Тестове розгортання на Oracle Cloud Free

Ця інструкція описує фактичне тестове розгортання сайту на Oracle Cloud Free в регіоні **Germany Central (Frankfurt)**. Схема використовує один Ubuntu-сервер:

```text
Інтернет → Caddy :80 → frontend/dist
                    ├─ /api, /uploads, /admin → Strapi :1337
                    └─ решта маршрутів → frontend/dist
```

Поточна тестова адреса може змінитися, якщо Oracle призначить іншу public IP. HTTPS і домен DuckDNS ще не налаштовані.

## 1. Oracle Cloud

Створено:

- регіон: `Germany Central (Frankfurt)`;
- образ: Ubuntu 24.04;
- shape: `VM.Standard.A1.Flex`, 2 OCPU, 12 GB RAM;
- boot volume: 50 GB;
- VCN: `nb-school-vcn`, CIDR `10.0.0.0/16`;
- public subnet: `nb-school-public`, CIDR `10.0.1.0/24`;
- Internet Gateway: `nb-school-igw`;
- route table: `nb-school-public-rt` з маршрутом `0.0.0.0/0` через Internet Gateway.

У Default Security List потрібні ingress-правила:

| Source | Protocol | Destination port | Призначення |
| --- | --- | --- | --- |
| `0.0.0.0/0` | TCP | `22` | SSH |
| `0.0.0.0/0` | TCP | `80` | HTTP |

Порт `1337` назовні не відкривати: CMS доступна через Caddy.

## 2. Підключення по SSH

Приватний ключ зберігається тільки локально, наприклад:

```powershell
$key = "$env:USERPROFILE\.ssh\ssh-key-2026-10-03.key"
ssh -i $key ubuntu@PUBLIC_IP
```

Перевірка доступності з Windows:

```powershell
Test-NetConnection PUBLIC_IP -Port 22
Test-NetConnection PUBLIC_IP -Port 80
```

## 3. Підготовка Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git curl build-essential caddy libreoffice-writer
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Потрібен Node.js 22. LibreOffice потрібен поточній реалізації автоматичної конвертації DOC/DOCX у PDF.

## 4. Клонування, залежності та база

```bash
sudo mkdir -p /opt/nb-school-site
sudo chown -R ubuntu:ubuntu /opt/nb-school-site
git clone https://github.com/nbschool2026/nb-school-site.git /opt/nb-school-site

cd /opt/nb-school-site/cms
npm ci

cd /opt/nb-school-site/frontend
npm ci

cd /opt/nb-school-site
mkdir -p cms/.tmp
cp backups/cms-content.db cms/.tmp/data.db
```

`backups/cms-content.db` — це знімок бази з Git. Фото й документи приходять разом із комітом у `cms/public/uploads/`. Це не заміна регулярного резервного копіювання робочої бази.

## 5. Production `.env` CMS

Секрети генеруються тільки на сервері та не додаються до Git:

```bash
cd /opt/nb-school-site
APP_KEYS="$(openssl rand -hex 32),$(openssl rand -hex 32)"
API_TOKEN_SALT="$(openssl rand -hex 32)"
ADMIN_JWT_SECRET="$(openssl rand -hex 32)"
TRANSFER_TOKEN_SALT="$(openssl rand -hex 32)"
JWT_SECRET="$(openssl rand -hex 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"

cat > cms/.env <<EOF
HOST=0.0.0.0
PORT=1337
APP_KEYS=$APP_KEYS
API_TOKEN_SALT=$API_TOKEN_SALT
ADMIN_JWT_SECRET=$ADMIN_JWT_SECRET
TRANSFER_TOKEN_SALT=$TRANSFER_TOKEN_SALT
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
STRAPI_PLUGIN_I18N_INIT_LOCALE_CODE=uk
EOF
```

Не публікувати `cms/.env` і не надсилати його в чат.

## 6. ARM-збірка frontend

На Oracle Ampere `npm ci` може не встановити optional ARM-пакет Rollup. Якщо `npm run build` показує `Cannot find module @rollup/rollup-linux-arm64-gnu`, виконати:

```bash
cd /opt/nb-school-site/frontend
ROLLUP_VERSION=$(node -p "require('./node_modules/rollup/package.json').version")
npm install --no-save "@rollup/rollup-linux-arm64-gnu@$ROLLUP_VERSION"
npm run build
```

Зібрати CMS:

```bash
cd /opt/nb-school-site/cms
npm run build
```

## 7. Запуск Strapi через systemd

```bash
sudo tee /etc/systemd/system/nb-school-cms.service > /dev/null <<'EOF'
[Unit]
Description=NB School Strapi CMS
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/nb-school-site/cms
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now nb-school-cms
sudo systemctl status nb-school-cms --no-pager
```

## 8. Caddy та frontend

Поточний Caddyfile проксить API, uploads і всю адмінку до Strapi, а решту віддає зі зібраного frontend:

```caddyfile
http://PUBLIC_IP {
    handle /api {
        reverse_proxy 127.0.0.1:1337
    }

    handle /api/* {
        reverse_proxy 127.0.0.1:1337
    }

    handle /uploads {
        reverse_proxy 127.0.0.1:1337
    }

    handle /uploads/* {
        reverse_proxy 127.0.0.1:1337
    }

    handle /admin {
        reverse_proxy 127.0.0.1:1337
    }

    handle /admin/* {
        reverse_proxy 127.0.0.1:1337
    }

    handle /content-manager {
        reverse_proxy 127.0.0.1:1337
    }

    handle /content-manager/* {
        reverse_proxy 127.0.0.1:1337
    }

    handle /upload {
        reverse_proxy 127.0.0.1:1337
    }

    handle /upload/* {
        reverse_proxy 127.0.0.1:1337
    }

    handle /i18n {
        reverse_proxy 127.0.0.1:1337
    }

    handle /i18n/* {
        reverse_proxy 127.0.0.1:1337
    }

    handle {
        root * /opt/nb-school-site/frontend/dist
        try_files {path} /index.html
        file_server
    }
}
```

Застосувати:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
```

## 9. Ubuntu iptables

В Oracle Security List недостатньо відкрити порт: базовий Ubuntu image також має правило `REJECT` після дозволу SSH. Додати HTTP перед ним:

```bash
sudo iptables -I INPUT 5 -p tcp --dport 80 -m conntrack --ctstate NEW -j ACCEPT
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

Перевірити локально:

```bash
sudo ss -ltnp | grep ':80'
curl -I http://127.0.0.1
curl -I -H "Host: PUBLIC_IP" http://127.0.0.1/admin
```

Остання команда має повертати `X-Powered-By: Strapi`.

## 10. Створення першого адміністратора

Поки немає HTTPS, не вводити пароль адміністратора через public HTTP. Створити адміна через зашифрований SSH-тунель:

```powershell
ssh -i "$env:USERPROFILE\.ssh\ssh-key-2026-10-03.key" -L 2337:127.0.0.1:1337 ubuntu@PUBLIC_IP
```

Залишити це вікно відкритим і відкрити:

```text
http://127.0.0.1:2337/admin
```

Після введення даних тунель можна закрити. Для постійного публічного доступу потрібні DuckDNS-домен і HTTPS через Caddy.

## 11. Типові проблеми

- `Connection timed out` на SSH: перевірити ingress TCP `22`, public subnet, Internet Gateway і route `0.0.0.0/0`.
- SSH працює, а HTTP ні: додати ingress TCP `80` та правило iptables для `80`.
- `npm run build` не знаходить `@rollup/rollup-linux-arm64-gnu`: виконати ARM workaround з розділу 6.
- `/admin` відкриває frontend: перевірити Caddyfile з окремими маршрутами `/admin` і `/admin/*`, виконати `caddy validate` та `systemctl reload caddy`.
- `curl http://PUBLIC_IP` із самого сервера може не працювати через доступ до власної public IP. Перевіряти public порт із Windows через `Test-NetConnection`.

## 12. Наступний крок

Підключити DuckDNS, додати HTTPS у Caddy, перевірити публічні API та адмінку через домен, а потім налаштувати резервне копіювання `cms/.tmp/data.db` і `cms/public/uploads/` поза сервером.
