# Neximatrix.com account center

This project keeps the existing Next.js/Tailwind presentation and adds a separate PHP/PDO account API for Apache/XAMPP. Authentication, sessions, account status, roles, profile updates, notifications, activity history, and support conversations are backed by MySQL.

Financial execution is intentionally out of scope. There are no deposit, withdrawal, payment, cryptocurrency, investment-execution, return, or profit-calculation endpoints. The existing financial pages are safe placeholders and do not read or write financial data.

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **API:** PHP 8.1+ under Apache, PDO MySQL
- **Database:** MySQL/MariaDB database named `Neximatrix.com`
- **Authorization:** PHP session ownership plus database role lookup on every protected request

The PHP service is the authority for authentication and authorization. `src/proxy.ts` provides an early route redirect, but it is not a replacement for PHP authorization.

## Local XAMPP setup

1. Start Apache and MySQL in the XAMPP Control Panel.
2. Copy the backend environment template:

   ```powershell
   Copy-Item backend/.env.example backend/.env
   ```

3. Edit `backend/.env` with the MySQL credentials and the frontend origin. Keep `APP_ORIGIN` limited to trusted origins. For HTTPS deployments set `SESSION_SECURE=true` and use HTTPS for both the frontend and API. Use a dedicated least-privilege MySQL user outside local development instead of the XAMPP `root` account.
4. Create the database and tables:

   ```powershell
   & 'C:\xampp\mysql\bin\mysql.exe' -u root -e "source C:/xampp/htdocs/INVEST PR/backend/database/schema.sql"
   ```

5. Create the first administrator. The API has no admin-provisioning route by design, so this is a one-off manual step. Generate a password hash first:

   ```powershell
   php -r "echo password_hash('Use-A-Strong-Password1', PASSWORD_DEFAULT);"
   ```

   Then insert the account with the hash it prints, substituting your own name, username, email, and password:

   ```sql
   INSERT INTO users (full_name, username, email, password_hash, status, email_verified_at)
   VALUES ('Local Administrator', 'localadmin', 'admin@example.com', '<paste-the-hash-here>', 'active', UTC_TIMESTAMP());

   INSERT INTO user_roles (user_id, role_id)
   VALUES (LAST_INSERT_ID(), (SELECT id FROM roles WHERE name = 'super_admin'));
   ```

   ```powershell
   & 'C:\xampp\mysql\bin\mysql.exe' -u root -D Neximatrix.com < administrator.sql
   ```

   `email_verified_at` is set so the account can sign in immediately. This runs `super_admin`; use `'admin'` instead if the account should not have the highest role. The password is never stored in source control — only the resulting hash is.

   The two steps are separate on purpose. Some endpoint-security products quarantine any PHP file that provisions an administrator account, so the repository deliberately ships no such script, and the hash step keeps the password out of the shell history of the insert step.

6. Configure the frontend API URL in `.env.local`:

   ```env
   NEXT_PUBLIC_PHP_API_URL=http://localhost/INVEST%20PR/backend/public/index.php
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

7. Install and run the frontend:

   ```powershell
   npm install
   npm run dev
   ```

Open `http://localhost:3000/login` for the user panel or `http://localhost:3000/admin/login` for the administrator panel.

## Routes

### User panel

- `/dashboard` — account overview and recent activity
- `/profile` — permitted profile updates and logout
- `/activity` — account activity history
- `/notifications` — notifications and read state
- `/support` — support ticket creation and replies

### Administrator panel

- `/admin` — account and support overview
- `/admin/users` — user search, permitted profile fields, and account status
- `/admin/support` — ticket conversation, internal notes, responses, and status
- `/admin/notifications` — targeted or active-user broadcast notifications
- `/admin/content` — allowlisted support/announcement text
- `/admin/activity` — administrator-visible audit activity

## API

The front controller is `backend/public/index.php`; routes are selected with the `route` query parameter. All mutating requests require a session CSRF token obtained from `auth/csrf`. The API uses PDO prepared statements, `password_hash()`/`password_verify()`, session ID rotation, HttpOnly cookies, generic login errors, server-side role checks, account-status checks, and activity logging.

Examples:

```text
GET  backend/public/index.php?route=health
GET  backend/public/index.php?route=auth/csrf
POST backend/public/index.php?route=auth/login
GET  backend/public/index.php?route=user/dashboard
```

Do not place the API behind a route that trusts browser-supplied user IDs or roles. The PHP handlers derive the current user from the server session and load roles/status from MySQL.

## Password reset mail

The reset endpoint is implemented, but mail delivery is disabled by default because XAMPP is not a production mail server. Set `MAIL_ENABLED=true` and configure a working PHP mail transport in the deployment environment. The API always returns a generic response so it does not disclose whether an email exists.

## HYIP archive import

Administrators can stage a legacy HYIP archive at `/admin/setup`. The importer accepts a ZIP up to 32 MB, validates archive paths, blocks symlinks and `.env` files, skips uploaded `.htaccess` files, records a SHA-256 hash, and extracts only into the Apache-denied `backend/storage/hyip-imports` directory.

This is intentionally **stage-only**: it never runs `install.php`, never exposes extracted PHP, and never enables deposits, withdrawals, investments, payments, or profit features. The preflight report identifies ionCube-encoded entry points, missing loaders, installer files, and financial feature files. A compatible ionCube Loader and a separate security review are required before any activation step.

The PHP `zip` extension must be enabled in XAMPP for imports to work. The server upload limits are already configured for 40 MB in the local XAMPP `php.ini`.

## Verification

```powershell
php -l backend\app\config.php
npm run lint
npm run build
```

The local API can be checked with:

```powershell
Invoke-WebRequest 'http://localhost/INVEST%20PR/backend/public/index.php?route=health'
```

Apache access rules in the project and backend directories deny `.env`, SQL, log, and application-source files. Keep those rules enabled when the project remains under `htdocs`.

Manual security checks used for the local implementation:

- Unauthenticated `user/dashboard` and `admin/dashboard` requests return `401`.
- A standard user receives `403` from every admin endpoint.
- Missing or stale CSRF tokens return `428`. The Laravel-style `419` is deliberately not used: Apache rewrites status codes it does not recognise to `500` on the wire, which would mask the real cause. The client retries once with a freshly fetched token on `428`.
- Suspending an account revokes its active sessions immediately.
- User support reads exclude administrator internal notes.
- The database contains only account/support/audit tables; there are no financial execution routes or tables.
