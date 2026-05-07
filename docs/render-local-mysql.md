# Connect Render to Local MySQL

Render cannot connect to `localhost` on your computer directly. When the backend runs on Render, `localhost` means the Render container, not your machine.

Use one of these options:

1. Recommended for production: use a hosted MySQL database and set `DATABASE_URL` or `DB_*` in Render.
2. For temporary testing: expose your local MySQL with a TCP tunnel or a public IP, then point Render to that public host.

## If You Use phpMyAdmin Locally

phpMyAdmin is only the database admin UI. Render does not connect to phpMyAdmin. Render must connect to the MySQL or MariaDB server that phpMyAdmin is managing.

Use the same database details you use in phpMyAdmin:

```text
Server/Host: usually localhost, 127.0.0.1, or host.docker.internal
Port: usually 3306
Username: your MySQL user
Password: your MySQL password
Database: read_and_voice
```

For local backend testing, those values can stay as `localhost` or `host.docker.internal`.

For Render, replace that local host with a public host or TCP tunnel host. Do not put the phpMyAdmin URL, such as `http://localhost/phpmyadmin`, into `DB_HOST` or `DATABASE_URL`.

## Aiven MySQL Example

If Render is connected to Aiven, use the Aiven connection values everywhere you want to see the same data.

Example:

```env
DB_MODE=cloud
DB_HOST=read-and-voice-prattanak1140-283d.i.aivencloud.com
DB_PORT=21989
DB_USER=avnadmin
DB_PASSWORD=<your-aiven-password>
DB_NAME=defaultdb
DB_SSL=true
DB_SSL_MODE=require
DB_SSL_REJECT_UNAUTHORIZED=false
```

Or use Aiven's service URI:

```env
DATABASE_URL=mysql://avnadmin:<your-aiven-password>@read-and-voice-prattanak1140-283d.i.aivencloud.com:21989/defaultdb?ssl-mode=REQUIRED
DB_SSL=true
DB_SSL_MODE=require
DB_SSL_REJECT_UNAUTHORIZED=false
```

## Render Environment Variables

In the Render backend service, open **Environment** and set:

```env
DB_MODE=cloud
DB_HOST=<public-mysql-host-or-tunnel-host>
DB_PORT=<public-mysql-port>
DB_USER=<mysql-user>
DB_PASSWORD=<mysql-password>
DB_NAME=read_and_voice
DB_SSL=false
DB_SSL_MODE=disable
DB_SSL_REJECT_UNAUTHORIZED=false
PORT=10000
```

You can also use a single URL instead:

```env
DATABASE_URL=mysql://<mysql-user>:<mysql-password>@<public-mysql-host-or-tunnel-host>:<public-mysql-port>/read_and_voice
```

Do not use these values on Render for a local database:

```env
DB_HOST=localhost
DB_HOST=127.0.0.1
```

## Local MySQL Checklist

Create a database and user that can connect remotely:

```sql
CREATE DATABASE IF NOT EXISTS read_and_voice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'readvoice'@'%' IDENTIFIED BY 'replace-with-strong-password';
GRANT ALL PRIVILEGES ON read_and_voice.* TO 'readvoice'@'%';
FLUSH PRIVILEGES;
```

Make sure MySQL listens on a network interface, not only `127.0.0.1`.

In `my.ini` or `my.cnf`, check:

```ini
bind-address=0.0.0.0
```

Restart MySQL after changing this setting.

## Test From This Project

For local testing from your machine, put local values in `backend/.env`:

```env
DB_MODE=local
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=read_and_voice
```

Then run:

```powershell
cd backend
npm run db:test
npm run db:init
```

For Render testing, update the Render environment variables and redeploy. The backend logs should include `Connected to MySQL`.

## Important

Using a local computer as a database for Render is fragile. The site will fail whenever the computer sleeps, the tunnel stops, the IP changes, or the firewall blocks the port. A hosted MySQL database is the stable deployment path.
