<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

// CORS headers for frontend access
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$routeValue = $_GET['route'] ?? 'health';
$route = is_string($routeValue) ? trim($routeValue, '/') : '';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
    switch ($route) {
        case 'health':
            neximatrix_method('GET');
            neximatrix_db()->query('SELECT 1');
            neximatrix_success(['service' => 'Neximatrix-php-api', 'database' => 'connected']);
            // no break

        case 'crypto/networks':
            neximatrix_method('GET');
            neximatrix_require_user();
            neximatrix_success(['networks' => neximatrix_crypto_networks_list(neximatrix_db())]);
            // no break: neximatrix_success exits

        case 'auth/csrf':
            neximatrix_method('GET');
            neximatrix_success(['csrf_token' => neximatrix_csrf_token()]);
            // no break

        case 'auth/me':
            neximatrix_method('GET');
            $currentUser = neximatrix_current_user();
            if ($currentUser === null) {
                neximatrix_http_error('Authentication required.', 401);
            }
            neximatrix_success(['user' => $currentUser]);
            // no break

        case 'auth/register':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $fullName = neximatrix_string($input['full_name'] ?? '', 2, 120);
            $username = neximatrix_username($input['username'] ?? '');
            $email = neximatrix_email($input['email'] ?? '');
            $phone = neximatrix_string($input['phone'] ?? '', 7, 30);
            $password = neximatrix_password($input['password'] ?? '');
            $passwordConfirmationValue = $input['password_confirmation'] ?? '';
            $passwordConfirmation = is_string($passwordConfirmationValue) ? $passwordConfirmationValue : '';
            $errors = [];
            if ($fullName === '') {
                $errors['full_name'] = 'Enter your full name.';
            }
            if ($username === '') {
                $errors['username'] = 'Use 3–50 letters, numbers, or underscores.';
            }
            if ($email === '') {
                $errors['email'] = 'Enter a valid email address.';
            }
            if ($phone === '') {
                $errors['phone'] = 'Enter a valid phone number.';
            }
            if ($password === '' || $password !== $passwordConfirmation) {
                $errors['password'] = 'Use at least 8 characters with a letter and number.';
            }
            if ($errors !== []) {
                neximatrix_http_error('Please correct the highlighted fields.', 422, $errors);
            }

            $pdo = neximatrix_db();
            if (neximatrix_find_user_by_identifier($pdo, $email) !== null || neximatrix_find_user_by_identifier($pdo, $username) !== null) {
                neximatrix_http_error('We could not create an account with those details.', 409);
            }

            $pdo->beginTransaction();
            try {
                $insert = $pdo->prepare(
                    'INSERT INTO users (full_name, username, email, phone, password_hash, status)
                     VALUES (:full_name, :username, :email, :phone, :password_hash, \'active\')'
                );
                $insert->execute([
                    ':full_name' => $fullName,
                    ':username' => $username,
                    ':email' => $email,
                    ':phone' => $phone,
                    ':password_hash' => password_hash($password, PASSWORD_DEFAULT),
                ]);
                $userId = (int) $pdo->lastInsertId();
                $role = $pdo->prepare("SELECT id FROM roles WHERE name = 'user' LIMIT 1");
                $role->execute();
                $roleId = $role->fetchColumn();
                if ($roleId === false) {
                    throw new RuntimeException('Default user role is missing.');
                }
                $pdo->prepare('INSERT INTO user_roles (user_id, role_id) VALUES (:user_id, :role_id)')
                    ->execute([':user_id' => $userId, ':role_id' => $roleId]);
                neximatrix_log_activity($pdo, $userId, 'user', 'user.registered', 'user', $userId);
                $pdo->commit();
            } catch (Throwable $exception) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $exception;
            }

            $user = neximatrix_user_by_id($pdo, $userId);
            neximatrix_start_session($pdo, $user);
            NeximatrixMailService::sendWelcomeEmail($email, $fullName);
            neximatrix_success(['user' => neximatrix_user_dto($user, neximatrix_user_roles($pdo, $userId))], 201);
            // no break

        case 'auth/login':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $identifier = neximatrix_string($input['identifier'] ?? $input['email'] ?? '', 3, 190);
            $passwordValue = $input['password'] ?? '';
            $password = is_string($passwordValue) ? $passwordValue : '';
            $pdo = neximatrix_db();
            $rateLimit = neximatrix_check_rate_limit($pdo, $identifier);
            if ($rateLimit['locked']) {
                neximatrix_http_error('Too many failed attempts. Please try again later.', 429);
            }
            $user = neximatrix_find_user_by_identifier($pdo, $identifier);
            if ($user === null || !password_verify($password, (string) $user['password_hash'])) {
                neximatrix_log_login_attempt($pdo, $user['id'] ?? null, $identifier, false);
                neximatrix_http_error('Invalid credentials.', 401);
            }
            if ($user['status'] !== 'active') {
                neximatrix_log_login_attempt($pdo, $user['id'] ?? null, $identifier, false);
                neximatrix_http_error('Invalid credentials.', 401);
            }
            neximatrix_log_login_attempt($pdo, (int) $user['id'], $identifier, true);
            neximatrix_start_session($pdo, $user);
            neximatrix_log_activity($pdo, (int) $user['id'], 'user', 'user.logged_in', 'user', (int) $user['id']);
            if (neximatrix_get_setting($pdo, 'login_notification_enabled') === '1') {
                NeximatrixMailService::sendLoginNotificationEmail((string) $user['email'], (string) ($user['full_name'] ?? $user['username']));
            }
            $user = neximatrix_user_by_id($pdo, (int) $user['id']);
            neximatrix_success(['user' => neximatrix_user_dto($user, neximatrix_user_roles($pdo, (int) $user['id']))]);
            // no break

        case 'admin/login':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $identifier = neximatrix_string($input['identifier'] ?? $input['email'] ?? '', 3, 190);
            $passwordValue = $input['password'] ?? '';
            $password = is_string($passwordValue) ? $passwordValue : '';
            $pdo = neximatrix_db();
            $user = neximatrix_find_user_by_identifier($pdo, $identifier);
            if ($user === null || !password_verify($password, (string) $user['password_hash'])) {
                neximatrix_log_login_attempt($pdo, $user['id'] ?? null, $identifier, false);
                neximatrix_http_error('Invalid administrator credentials.', 401);
            }
            if ($user['status'] !== 'active') {
                neximatrix_log_login_attempt($pdo, $user['id'] ?? null, $identifier, false);
                neximatrix_http_error('Invalid administrator credentials.', 401);
            }
            $roles = neximatrix_user_roles($pdo, (int) $user['id']);
            if (!array_intersect($roles, ['admin', 'super_admin'])) {
                neximatrix_log_login_attempt($pdo, (int) $user['id'], $identifier, false);
                neximatrix_http_error('Administrator access is required.', 403);
            }
            neximatrix_log_login_attempt($pdo, (int) $user['id'], $identifier, true);
            neximatrix_start_session($pdo, $user);
            neximatrix_log_activity($pdo, (int) $user['id'], $roles[0], 'admin.logged_in', 'user', (int) $user['id']);
            $user = neximatrix_user_by_id($pdo, (int) $user['id']);
            neximatrix_success(['user' => neximatrix_user_dto($user, $roles)]);
            // no break

        case 'auth/logout':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $pdo = neximatrix_db();
            $user = neximatrix_current_user();
            if ($user !== null) {
                neximatrix_revoke_current_session($pdo, $user['id']);
                $isAdmin = array_intersect($user['roles'], ['admin', 'super_admin']) !== [];
                neximatrix_log_activity($pdo, $user['id'], $isAdmin ? 'admin' : 'user', 'user.logged_out', 'user', $user['id']);
            }
            neximatrix_destroy_session();
            neximatrix_success(['logged_out' => true]);
            // no break

        case 'auth/change-password':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $user = neximatrix_require_user();
            $input = neximatrix_input();
            $currentPasswordValue = $input['current_password'] ?? '';
            $confirmationValue = $input['new_password_confirmation'] ?? '';
            $currentPassword = is_string($currentPasswordValue) ? $currentPasswordValue : '';
            $newPassword = neximatrix_password($input['new_password'] ?? '');
            $confirmation = is_string($confirmationValue) ? $confirmationValue : '';
            $pdo = neximatrix_db();
            $userRecord = neximatrix_user_by_id($pdo, $user['id']);
            if ($userRecord === null || !password_verify($currentPassword, (string) $userRecord['password_hash'])) {
                neximatrix_http_error('Current password is incorrect.', 422, ['current_password' => 'Check your current password.']);
            }
            if ($newPassword === '' || $newPassword !== $confirmation) {
                neximatrix_http_error('New password is invalid.', 422, ['new_password' => 'Use at least 8 characters with a letter and number.']);
            }
            $pdo->prepare('UPDATE users SET password_hash = :password_hash, updated_at = UTC_TIMESTAMP() WHERE id = :id')
                ->execute([':password_hash' => password_hash($newPassword, PASSWORD_DEFAULT), ':id' => $user['id']]);
            $pdo->prepare(
                'UPDATE auth_tokens SET used_at = UTC_TIMESTAMP()
                 WHERE user_id = :user_id AND purpose = \'password_reset\' AND used_at IS NULL'
            )->execute([':user_id' => $user['id']]);
            $currentHash = hash('sha256', (string) session_id());
            $pdo->prepare(
                'UPDATE sessions SET revoked_at = UTC_TIMESTAMP()
                 WHERE user_id = :user_id AND session_hash <> :current_hash AND revoked_at IS NULL'
            )->execute([':user_id' => $user['id'], ':current_hash' => $currentHash]);
            neximatrix_log_activity($pdo, $user['id'], 'user', 'password.changed', 'user', $user['id']);
            NeximatrixMailService::sendPasswordChangedEmail((string) $user['email'], (string) $user['fullName']);
            neximatrix_success(['updated' => true]);
            // no break

        case 'auth/forgot-password':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $email = neximatrix_email($input['email'] ?? '');
            if ($email !== '') {
                $pdo = neximatrix_db();
                $user = neximatrix_find_user_by_identifier($pdo, $email);
                if ($user !== null) {
                    $token = bin2hex(random_bytes(32));
                    $statement = $pdo->prepare(
                        'INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at)
                         VALUES (:user_id, \'password_reset\', :token_hash, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))'
                    );
                    $statement->execute([
                        ':user_id' => $user['id'],
                        ':token_hash' => hash('sha256', $token),
                    ]);
                    NeximatrixMailService::sendPasswordResetEmail($email, (string) $user['full_name'], $token);
                }
            }
            neximatrix_success(['message' => 'If an account exists, password reset instructions will be sent.']);
            // no break

        case 'auth/reset-password':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $token = neximatrix_string($input['token'] ?? '', 64, 64);
            $password = neximatrix_password($input['password'] ?? '');
            $passwordConfirmationValue = $input['password_confirmation'] ?? '';
            $passwordConfirmation = is_string($passwordConfirmationValue) ? $passwordConfirmationValue : '';
            if ($token === '' || $password === '' || $password !== $passwordConfirmation) {
                neximatrix_http_error('Invalid reset request.', 422);
            }
            $pdo = neximatrix_db();
            $pdo->beginTransaction();
            try {
                $statement = $pdo->prepare(
                    'SELECT id, user_id FROM auth_tokens
                     WHERE token_hash = :token_hash AND purpose = \'password_reset\'
                       AND used_at IS NULL AND expires_at > UTC_TIMESTAMP() LIMIT 1 FOR UPDATE'
                );
                $statement->execute([':token_hash' => hash('sha256', $token)]);
                $tokenRow = $statement->fetch();
                if ($tokenRow === false) {
                    neximatrix_http_error('Reset token is invalid or expired.', 422);
                }
                $pdo->prepare('UPDATE users SET password_hash = :password_hash, updated_at = UTC_TIMESTAMP() WHERE id = :user_id')
                    ->execute([':password_hash' => password_hash($password, PASSWORD_DEFAULT), ':user_id' => $tokenRow['user_id']]);
                $pdo->prepare('UPDATE auth_tokens SET used_at = UTC_TIMESTAMP() WHERE id = :id AND used_at IS NULL')->execute([':id' => $tokenRow['id']]);
                $pdo->prepare('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = :user_id AND revoked_at IS NULL')
                    ->execute([':user_id' => $tokenRow['user_id']]);
                $pdo->commit();
            } catch (Throwable $exception) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $exception;
            }
            neximatrix_success(['message' => 'Password updated. You can now sign in.']);
            // no break

        case 'user/dashboard':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            neximatrix_success(['summary' => neximatrix_dashboard_summary(neximatrix_db(), $user['id'])]);
            // no break

        case 'user/profile':
            neximatrix_method('GET', 'PATCH');
            $user = neximatrix_require_user();
            $pdo = neximatrix_db();
            if ($method === 'PATCH') {
                neximatrix_require_csrf();
                $updated = neximatrix_update_profile($pdo, $user['id'], neximatrix_input());
                neximatrix_log_activity($pdo, $user['id'], 'user', 'profile.updated', 'user', $user['id']);
                neximatrix_success(['user' => $updated]);
            }
            neximatrix_success(['user' => $user]);
            // no break

        case 'user/notifications':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            neximatrix_success(['notifications' => neximatrix_list_notifications(neximatrix_db(), $user['id'])]);
            // no break

        case 'user/notifications/read':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $user = neximatrix_require_user();
            $input = neximatrix_input();
            $notificationId = (int) ($input['id'] ?? 0);
            if ($notificationId < 1) {
                neximatrix_http_error('Notification id is required.', 422);
            }
            neximatrix_mark_notification_read(neximatrix_db(), $user['id'], $notificationId);
            neximatrix_success(['updated' => true]);
            // no break

        case 'user/activity':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            neximatrix_success(['activity' => neximatrix_activity(neximatrix_db(), $user['id'])]);
            // no break

        case 'user/support':
            neximatrix_method('GET', 'POST');
            $user = neximatrix_require_user();
            $pdo = neximatrix_db();
            if ($method === 'POST') {
                neximatrix_require_csrf();
                $input = neximatrix_input();
                $subject = neximatrix_string($input['subject'] ?? '', 3, 160);
                $body = neximatrix_string($input['message'] ?? '', 1, 10000);
                if ($subject === '' || $body === '') {
                    neximatrix_http_error('Subject and message are required.', 422);
                }
                $pdo->beginTransaction();
                try {
                    $ticketId = neximatrix_create_support_ticket($pdo, $user['id'], $subject, $body);
                    neximatrix_log_activity($pdo, $user['id'], 'user', 'support_ticket.created', 'support_ticket', $ticketId);
                    $pdo->commit();
                } catch (Throwable $exception) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    throw $exception;
                }
                neximatrix_success(['ticket' => neximatrix_support_ticket($pdo, $ticketId, $user['id'])], 201);
            }
            [$page, $limit, $offset] = neximatrix_page_params();
            $tickets = neximatrix_list_support_tickets($pdo, '', '', $limit, $offset, $user['id']);
            $tickets['page'] = $page;
            neximatrix_success(['tickets' => $tickets]);
            // no break

        case 'user/support/ticket':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            $ticketId = neximatrix_query_int('id');
            $ticket = neximatrix_support_ticket(neximatrix_db(), $ticketId, $user['id']);
            if ($ticket === null) {
                neximatrix_http_error('Support ticket not found.', 404);
            }
            neximatrix_success(['ticket' => $ticket]);
            // no break

        case 'user/support/reply':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $user = neximatrix_require_user();
            $input = neximatrix_input();
            $ticketId = (int) ($input['ticket_id'] ?? 0);
            $body = neximatrix_string($input['message'] ?? '', 1, 10000);
            $pdo = neximatrix_db();
            if ($ticketId < 1 || $body === '' || neximatrix_support_ticket($pdo, $ticketId, $user['id']) === null) {
                neximatrix_http_error('Support ticket or message is invalid.', 422);
            }
            neximatrix_set_support_ticket_status($pdo, $ticketId, 'open');
            neximatrix_create_support_message($pdo, $ticketId, $user['id'], 'user', $body);
            neximatrix_log_activity($pdo, $user['id'], 'user', 'support_message.created', 'support_ticket', $ticketId);
            neximatrix_success(['ticket' => neximatrix_support_ticket($pdo, $ticketId, $user['id'])]);
            // no break

        case 'admin/dashboard':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_success(['dashboard' => neximatrix_admin_dashboard(neximatrix_db())]);
            // no break

        case 'admin/users':
            neximatrix_method('GET');
            neximatrix_require_admin();
            [$page, $limit, $offset] = neximatrix_page_params();
            $result = neximatrix_list_users(
                neximatrix_db(),
                neximatrix_query_string('search'),
                neximatrix_query_string('status'),
                $limit,
                $offset
            );
            $result['page'] = $page;
            neximatrix_success(['users' => $result]);
            // no break

        case 'admin/user':
            neximatrix_method('GET', 'PATCH');
            $admin = neximatrix_require_admin();
            $userId = neximatrix_query_int('id');
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                $detail = neximatrix_admin_user_detail($pdo, $userId);
                if ($detail === null) {
                    neximatrix_http_error('User not found.', 404);
                }
                neximatrix_success(['detail' => $detail]);
            }
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $updated = neximatrix_admin_update_user($pdo, $userId, $input);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.user.updated', 'user', $userId, ['fields' => array_keys($input)]);
            neximatrix_success(['user' => $updated]);
            // no break

        case 'admin/user/status':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $userId = (int) ($input['user_id'] ?? 0);
            $status = (string) ($input['status'] ?? '');
            if ($userId === $admin['id']) {
                neximatrix_http_error('You cannot change your own account status here.', 422);
            }
            $pdo = neximatrix_db();
            $targetUser = neximatrix_user_by_id($pdo, $userId);
            if ($targetUser === null) {
                neximatrix_http_error('User not found.', 404);
            }
            neximatrix_set_user_status($pdo, $userId, $status);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.user.status_changed', 'user', $userId, ['status' => $status]);
            NeximatrixMailService::sendAccountStatusEmail((string) $targetUser['email'], (string) $targetUser['full_name'], $status);
            neximatrix_success(['updated' => true]);
            // no break

        case 'admin/support':
            neximatrix_method('GET');
            neximatrix_require_admin();
            [$page, $limit, $offset] = neximatrix_page_params();
            $tickets = neximatrix_list_support_tickets(
                neximatrix_db(),
                neximatrix_query_string('search'),
                neximatrix_query_string('status'),
                $limit,
                $offset
            );
            $tickets['page'] = $page;
            neximatrix_success(['tickets' => $tickets]);
            // no break

        case 'admin/support/ticket':
            neximatrix_method('GET');
            neximatrix_require_admin();
            $ticket = neximatrix_support_ticket(neximatrix_db(), neximatrix_query_int('id'), null, true);
            if ($ticket === null) {
                neximatrix_http_error('Support ticket not found.', 404);
            }
            neximatrix_success(['ticket' => $ticket]);
            // no break

        case 'admin/support/reply':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $ticketId = (int) ($input['ticket_id'] ?? 0);
            $body = neximatrix_string($input['message'] ?? '', 1, 10000);
            $internalValue = $input['internal'] ?? false;
            $internal = filter_var($internalValue, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($internal === null) {
                neximatrix_http_error('Invalid internal-note flag.', 422);
            }
            $pdo = neximatrix_db();
            $ticket = neximatrix_support_ticket($pdo, $ticketId, null, true);
            if ($ticket === null || $body === '') {
                neximatrix_http_error('Support ticket or message is invalid.', 422);
            }
            neximatrix_create_support_message($pdo, $ticketId, $admin['id'], 'admin', $body, $internal);
            if (!$internal) {
                neximatrix_set_support_ticket_status($pdo, $ticketId, 'in_progress');
                neximatrix_create_notification($pdo, (int) $ticket['user_id'], 'Support response received', 'Your support ticket has received a new response.', 'support');
            }
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.support.replied', 'support_ticket', $ticketId, ['internal' => $internal]);
            neximatrix_success(['ticket' => neximatrix_support_ticket($pdo, $ticketId, null, true)]);
            // no break

        case 'admin/support/status':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $ticketId = (int) ($input['ticket_id'] ?? 0);
            $status = (string) ($input['status'] ?? '');
            $pdo = neximatrix_db();
            $ticket = neximatrix_support_ticket($pdo, $ticketId, null, true);
            neximatrix_set_support_ticket_status($pdo, $ticketId, $status);
            if (in_array($status, ['resolved', 'closed'], true)) {
                neximatrix_create_notification($pdo, (int) $ticket['user_id'], 'Support ticket updated', 'Your support ticket status was updated.', 'support');
            }
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.support.status_changed', 'support_ticket', $ticketId, ['status' => $status]);
            neximatrix_success(['updated' => true]);
            // no break

        case 'admin/notifications':
            neximatrix_method('GET', 'POST');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                $statement = $pdo->query(
                    'SELECT n.id, n.user_id, n.title, n.message, n.type, n.read_at, n.created_at,
                            u.username
                     FROM notifications n LEFT JOIN users u ON u.id = n.user_id
                     ORDER BY n.created_at DESC LIMIT 100'
                );
                neximatrix_success(['notifications' => $statement->fetchAll()]);
            }
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $title = neximatrix_string($input['title'] ?? '', 2, 160);
            $message = neximatrix_string($input['message'] ?? '', 1, 5000);
            $userId = isset($input['user_id']) && $input['user_id'] !== '' ? (int) $input['user_id'] : null;
            if ($title === '' || $message === '') {
                neximatrix_http_error('Notification title and message are required.', 422);
            }

            if ($userId !== null) {
                $userCheck = $pdo->prepare('SELECT id FROM users WHERE id = :id LIMIT 1');
                $userCheck->execute([':id' => $userId]);
                if ($userCheck->fetchColumn() === false) {
                    neximatrix_http_error('User not found.', 404);
                }
                neximatrix_create_notification($pdo, $userId, $title, $message, 'admin');
            } else {
                $activeUsers = $pdo->query("SELECT id FROM users WHERE status = 'active'")->fetchAll(PDO::FETCH_COLUMN);
                $pdo->beginTransaction();
                try {
                    foreach ($activeUsers as $activeUserId) {
                        neximatrix_create_notification($pdo, (int) $activeUserId, $title, $message, 'admin');
                    }
                    $pdo->commit();
                } catch (Throwable $exception) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }
                    throw $exception;
                }
            }
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.notification.created', 'notification', null, ['user_id' => $userId]);
            neximatrix_success(['created' => true], 201);
            // no break

        case 'admin/content':
            neximatrix_method('GET', 'PATCH');
            neximatrix_require_admin();
            if ($method === 'GET') {
                neximatrix_success(['settings' => neximatrix_site_settings(neximatrix_db())]);
            }
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $pdo = neximatrix_db();
            $settings = neximatrix_update_site_settings($pdo, neximatrix_input(), $admin['id']);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.content.updated', 'site_settings', null);
            neximatrix_success(['settings' => $settings]);
            // no break

        case 'admin/hyip/status':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_success(['imports' => neximatrix_hyip_imports()]);
            // no break

        case 'admin/hyip/import':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $archive = $_FILES['archive'] ?? null;
            if (!is_array($archive)) {
                neximatrix_http_error('Choose a HYIP ZIP archive to upload.', 422);
            }
            $manifest = neximatrix_hyip_stage_upload($archive);
            neximatrix_log_activity(
                neximatrix_db(),
                $admin['id'],
                'admin',
                'admin.hyip.staged',
                'hyip_import',
                null,
                [
                    'import_id' => $manifest['id'],
                    'sha256' => $manifest['sha256'],
                    'encoded' => $manifest['preflight']['ionCubeEncoded'],
                ]
            );
            neximatrix_success(['import' => $manifest], 201);
            // no break

        case 'admin/activity':
            neximatrix_method('GET');
            neximatrix_require_admin();
            $statement = neximatrix_db()->query(
                'SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
                        u.username, u.full_name
                 FROM activity_logs a LEFT JOIN users u ON u.id = a.actor_user_id
                 ORDER BY a.created_at DESC LIMIT 100'
            );
            neximatrix_success(['activity' => $statement->fetchAll()]);
            // no break

        // ─── User Financial ───────────────────────────────────────────

        case 'user/finance/summary':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            neximatrix_success(['summary' => neximatrix_financial_summary(neximatrix_db(), $user['id'])]);
            // no break

        case 'user/finance/transactions':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            [$page, $limit, $offset] = neximatrix_page_params();
            $type = neximatrix_query_string('type');
            $result = neximatrix_list_transactions(neximatrix_db(), $user['id'], $limit, $offset, $type);
            $result['page'] = $page;
            neximatrix_success(['transactions' => $result]);
            // no break

        case 'user/finance/plans':
            neximatrix_method('GET');
            neximatrix_require_user();
            neximatrix_success(['plans' => neximatrix_list_plans(neximatrix_db())]);
            // no break

        case 'user/finance/invest':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $user = neximatrix_require_user();
            $input = neximatrix_input();
            $planId = (int) ($input['plan_id'] ?? 0);
            $amount = (float) ($input['amount'] ?? 0);
            if ($planId < 1 || $amount <= 0) {
                neximatrix_http_error('Plan and amount are required.', 422);
            }
            $investment = neximatrix_create_investment(neximatrix_db(), $user['id'], $planId, $amount);
            neximatrix_log_activity(neximatrix_db(), $user['id'], 'user', 'investment.created', 'investment', $investment['id'], ['amount' => $amount, 'plan_id' => $planId]);
            neximatrix_success(['investment' => $investment], 201);
            // no break

        case 'user/finance/investments':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            [$page, $limit, $offset] = neximatrix_page_params();
            $status = neximatrix_query_string('status');
            $result = neximatrix_list_investments(neximatrix_db(), $user['id'], $limit, $offset, $status);
            $result['page'] = $page;
            neximatrix_success(['investments' => $result]);
            // no break

        case 'user/finance/deposit':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $user = neximatrix_require_user();
            $input = neximatrix_input();
            $amount = (float) ($input['amount'] ?? 0);
            $networkId = (int) ($input['network_id'] ?? 0);
            $planId = isset($input['plan_id']) ? (int) $input['plan_id'] : null;
            $reference = neximatrix_string($input['reference'] ?? '', 0, 120);
            $payerAccount = neximatrix_string($input['payer_account'] ?? '', 0, 190);
            $idempotencyKey = neximatrix_string($input['idempotency_key'] ?? '', 0, 64);
            if ($amount <= 0) {
                neximatrix_http_error('Enter a valid deposit amount.', 422);
            }
            if ($amount > 999999999) {
                neximatrix_http_error('Amount exceeds maximum allowed.', 422);
            }
            if ($networkId < 1) {
                neximatrix_http_error('Select a payment network.', 422);
            }
            $pdo = neximatrix_db();

            // Idempotency check: prevent duplicate submissions
            if ($idempotencyKey !== '') {
                $existingStmt = $pdo->prepare(
                    'SELECT id, user_id, amount, method, network, reference, request_reference, proof_file, status, created_at, updated_at
                     FROM deposits WHERE user_id = :user_id AND idempotency_key = :idem LIMIT 1'
                );
                $existingStmt->execute([':user_id' => $user['id'], ':idem' => $idempotencyKey]);
                $existing = $existingStmt->fetch();
                if ($existing !== false) {
                    $existing['amount'] = (float) $existing['amount'];
                    neximatrix_success(['deposit' => $existing, 'duplicate' => true], 200);
                }
            }

            $network = neximatrix_crypto_network_get($pdo, $networkId);
            if ($network === null) {
                neximatrix_http_error('Invalid or disabled network.', 422);
            }
            $evidencePath = null;
            if (isset($_FILES['evidence']) && is_array($_FILES['evidence']) && $_FILES['evidence']['error'] === UPLOAD_ERR_OK) {
                $evidencePath = neximatrix_stage_deposit_evidence($_FILES['evidence'], $user['id']);
            }
            $deposit = neximatrix_create_crypto_deposit($pdo, $user['id'], $amount, $networkId, $reference, $evidencePath, $planId, $payerAccount, $idempotencyKey);
            neximatrix_log_activity($pdo, $user['id'], 'user', 'deposit.created', 'deposit', $deposit['id'], ['amount' => $amount, 'network' => $network['display_name'], 'plan_id' => $planId]);
            NeximatrixMailService::sendDepositUserNotification(
                (string) $user['email'],
                (string) $user['fullName'],
                $amount,
                $network['display_name'],
                'pending',
                $deposit['request_reference'],
                $deposit['plan_name'] ?? '',
                $deposit['deposit_fee'],
                $deposit['credit_amount'],
                $network['display_name']
            );
            NeximatrixMailService::notifyAdmins('deposit_admin', 'New deposit request', "User {$user['fullName']} submitted a deposit of \${$amount} via {$network['display_name']}. Reference: {$deposit['request_reference']}");
            neximatrix_success(['deposit' => $deposit], 201);
            // no break

        case 'user/finance/deposits':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            [$page, $limit, $offset] = neximatrix_page_params();
            $status = neximatrix_query_string('status');
            $result = neximatrix_list_deposits(neximatrix_db(), $user['id'], $limit, $offset, $status);
            $result['page'] = $page;
            neximatrix_success(['deposits' => $result]);
            // no break

        case 'user/finance/withdraw':
            neximatrix_method('POST');
            neximatrix_require_csrf();
            $user = neximatrix_require_user();
            $input = neximatrix_input();
            $amount = (float) ($input['amount'] ?? 0);
            $method = neximatrix_string($input['method'] ?? 'bank', 2, 40);
            $walletAddress = neximatrix_string($input['wallet_address'] ?? '', 8, 190);
            $withdrawal = neximatrix_create_withdrawal(neximatrix_db(), $user['id'], $amount, $method, $walletAddress);
            neximatrix_log_activity(neximatrix_db(), $user['id'], 'user', 'withdrawal.created', 'withdrawal', $withdrawal['id'], ['amount' => $amount, 'method' => $method]);
            NeximatrixMailService::sendWithdrawalRequestUserNotification((string) $user['email'], (string) $user['fullName'], $amount, $method);
            NeximatrixMailService::notifyAdmins('withdrawal_request_admin', 'New withdrawal request', "User {$user['fullName']} requested a withdrawal of \${$amount} via {$method}.");
            neximatrix_success(['withdrawal' => $withdrawal], 201);
            // no break

        case 'user/finance/withdrawals':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            [$page, $limit, $offset] = neximatrix_page_params();
            $status = neximatrix_query_string('status');
            $result = neximatrix_list_withdrawals(neximatrix_db(), $user['id'], $limit, $offset, $status);
            $result['page'] = $page;
            neximatrix_success(['withdrawals' => $result]);
            // no break

        case 'user/finance/referrals':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            [$page, $limit, $offset] = neximatrix_page_params();
            $result = neximatrix_list_referrals(neximatrix_db(), $user['id'], $limit, $offset);
            $result['page'] = $page;
            $result['stats'] = neximatrix_referral_stats(neximatrix_db(), $user['id']);
            neximatrix_success(['referrals' => $result]);
            // no break

        // ─── Admin Financial ──────────────────────────────────────────

        case 'admin/finance/stats':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_success(['stats' => neximatrix_admin_financial_stats(neximatrix_db())]);
            // no break

        case 'admin/finance/plans':
            neximatrix_method('GET', 'POST');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                neximatrix_success(['plans' => neximatrix_admin_list_plans($pdo)]);
            }
            neximatrix_require_csrf();
            $plan = neximatrix_admin_create_plan($pdo, neximatrix_input(), $admin['id']);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.plan.created', 'investment_plan', $plan['id'], ['name' => $plan['name']]);
            neximatrix_success(['plan' => $plan], 201);
            // no break

        case 'admin/finance/plan':
            neximatrix_method('PATCH');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $planId = neximatrix_query_int('id');
            $plan = neximatrix_admin_update_plan(neximatrix_db(), $planId, neximatrix_input());
            neximatrix_log_activity(neximatrix_db(), $admin['id'], 'admin', 'admin.plan.updated', 'investment_plan', $planId, ['fields' => array_keys(neximatrix_input())]);
            neximatrix_success(['plan' => $plan]);
            // no break

        case 'admin/finance/deposits':
            neximatrix_method('GET');
            neximatrix_require_admin();
            [$page, $limit, $offset] = neximatrix_page_params();
            $status = neximatrix_query_string('status');
            $result = neximatrix_list_all_deposits(neximatrix_db(), $status, $limit, $offset);
            $result['page'] = $page;
            neximatrix_success(['deposits' => $result]);
            // no break

        case 'admin/finance/deposit/review':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $depositId = (int) ($input['deposit_id'] ?? 0);
            $status = (string) ($input['status'] ?? '');
            $note = neximatrix_string($input['note'] ?? '', 0, 500);
            $pdo = neximatrix_db();
            $deposit = $pdo->prepare('SELECT d.*, u.full_name, u.email, p.name AS plan_name FROM deposits d INNER JOIN users u ON u.id = d.user_id LEFT JOIN investment_plans p ON p.id = d.plan_id WHERE d.id = :id LIMIT 1');
            $deposit->execute([':id' => $depositId]);
            $depositData = $deposit->fetch();
            neximatrix_review_deposit($pdo, $depositId, $status, $admin['id'], $note);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.deposit.reviewed', 'deposit', $depositId, ['status' => $status]);
            if ($depositData !== false && $status === 'approved') {
                $creditAmount = (float) ($depositData['credit_amount'] ?? $depositData['amount']);
                NeximatrixMailService::sendDepositApprovedUserNotification((string) $depositData['email'], (string) $depositData['full_name'], $creditAmount, (string) $depositData['method']);
                NeximatrixMailService::notifyAdmins('deposit_approved_admin', 'Deposit approved', "Deposit #{$depositId} for {$depositData['full_name']} was approved. Amount: \${$creditAmount}");
            } elseif ($depositData !== false && $status === 'rejected') {
                NeximatrixMailService::sendDepositRejectedUserNotification((string) $depositData['email'], (string) $depositData['full_name'], (float) $depositData['amount'], (string) $depositData['method'], $note);
            } elseif ($depositData !== false && $status === 'expired') {
                NeximatrixMailService::sendDepositExpiredUserNotification((string) $depositData['email'], (string) $depositData['full_name'], (float) $depositData['amount'], (string) $depositData['method']);
            }
            if ($depositData !== false && $status === 'approved') {
                neximatrix_create_notification($pdo, (int) $depositData['user_id'], 'Deposit approved', 'Your deposit of $' . number_format((float) ($depositData['credit_amount'] ?? $depositData['amount']), 2) . ' was approved.', 'deposit');
            } elseif ($depositData !== false && $status === 'rejected') {
                neximatrix_create_notification($pdo, (int) $depositData['user_id'], 'Deposit rejected', 'Your deposit was rejected.' . ($note !== '' ? ' Note: ' . $note : ''), 'deposit');
            }
            neximatrix_success(['updated' => true]);
            // no break

        case 'admin/finance/crypto-deposits':
            neximatrix_method('GET');
            neximatrix_require_admin();
            [$page, $limit, $offset] = neximatrix_page_params();
            $status = neximatrix_query_string('status');
            $search = neximatrix_query_string('search');
            $result = neximatrix_list_all_deposits(neximatrix_db(), $status, $limit, $offset, $search);
            $result['page'] = $page;
            neximatrix_success(['deposits' => $result]);
            // no break

        case 'admin/finance/crypto-deposit':
            neximatrix_method('GET');
            neximatrix_require_admin();
            $depositId = neximatrix_query_int('id');
            $deposit = neximatrix_admin_crypto_deposit_detail(neximatrix_db(), $depositId);
            if ($deposit === null) {
                neximatrix_http_error('Deposit not found.', 404);
            }
            neximatrix_success(['deposit' => $deposit]);
            // no break

        case 'user/finance/deposit/evidence':
            neximatrix_method('GET');
            $user = neximatrix_require_user();
            $depositId = neximatrix_query_int('id');
            $pdo = neximatrix_db();
            $stmt = $pdo->prepare('SELECT proof_file, evidence_path FROM deposits WHERE id = :id AND user_id = :user_id LIMIT 1');
            $stmt->execute([':id' => $depositId, ':user_id' => $user['id']]);
            $deposit = $stmt->fetch();
            if ($deposit === false || empty($deposit['proof_file'])) {
                neximatrix_http_error('Evidence not found.', 404);
            }
            $filePath = dirname(__DIR__, 2) . '/' . $deposit['proof_file'];
            if (!is_file($filePath)) {
                neximatrix_http_error('File not found.', 404);
            }
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->file($filePath);
            $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            if (!in_array($mimeType, $allowedTypes, true)) {
                neximatrix_http_error('Invalid file type.', 403);
            }
            header('Content-Type: ' . $mimeType);
            header('Content-Disposition: inline; filename="evidence_' . $depositId . '"');
            header('Content-Length: ' . filesize($filePath));
            header('X-Content-Type-Options: nosniff');
            readfile($filePath);
            exit;
            // no break

        case 'admin/finance/deposit/evidence':
            neximatrix_method('GET');
            neximatrix_require_admin();
            $depositId = neximatrix_query_int('id');
            $pdo = neximatrix_db();
            $stmt = $pdo->prepare('SELECT proof_file FROM deposits WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $depositId]);
            $deposit = $stmt->fetch();
            if ($deposit === false || empty($deposit['proof_file'])) {
                neximatrix_http_error('Evidence not found.', 404);
            }
            $filePath = dirname(__DIR__, 2) . '/' . $deposit['proof_file'];
            if (!is_file($filePath)) {
                neximatrix_http_error('File not found.', 404);
            }
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->file($filePath);
            $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
            if (!in_array($mimeType, $allowedTypes, true)) {
                neximatrix_http_error('Invalid file type.', 403);
            }
            header('Content-Type: ' . $mimeType);
            header('Content-Disposition: inline; filename="evidence_' . $depositId . '"');
            header('Content-Length: ' . filesize($filePath));
            header('X-Content-Type-Options: nosniff');
            readfile($filePath);
            exit;
            // no break

        case 'admin/finance/withdrawals':
            neximatrix_method('GET');
            neximatrix_require_admin();
            [$page, $limit, $offset] = neximatrix_page_params();
            $status = neximatrix_query_string('status');
            $result = neximatrix_list_all_withdrawals(neximatrix_db(), $status, $limit, $offset);
            $result['page'] = $page;
            neximatrix_success(['withdrawals' => $result]);
            // no break

        case 'admin/finance/withdrawal/review':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $withdrawalId = (int) ($input['withdrawal_id'] ?? 0);
            $status = (string) ($input['status'] ?? '');
            $note = neximatrix_string($input['note'] ?? '', 0, 500);
            $pdo = neximatrix_db();
            $withdrawal = $pdo->prepare('SELECT w.*, u.full_name, u.email FROM withdrawals w INNER JOIN users u ON u.id = w.user_id WHERE w.id = :id LIMIT 1');
            $withdrawal->execute([':id' => $withdrawalId]);
            $withdrawalData = $withdrawal->fetch();
            neximatrix_review_withdrawal($pdo, $withdrawalId, $status, $admin['id'], $note);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.withdrawal.reviewed', 'withdrawal', $withdrawalId, ['status' => $status]);
            if ($withdrawalData !== false && in_array($status, ['approved', 'rejected', 'paid'], true)) {
                NeximatrixMailService::sendWithdrawalUserNotification((string) $withdrawalData['email'], (string) $withdrawalData['full_name'], (float) $withdrawalData['amount'], (string) $withdrawalData['method'], $status);
                NeximatrixMailService::notifyAdmins('withdrawal_admin', 'Withdrawal ' . $status, "Withdrawal #{$withdrawalId} for {$withdrawalData['full_name']} was {$status}.");
                $wTitle = $status === 'rejected' ? 'Withdrawal rejected' : 'Withdrawal ' . $status;
                $wMsg = 'Your withdrawal of $' . number_format((float) $withdrawalData['amount'], 2) . ' was ' . $status . '.' . ($note !== '' ? ' Note: ' . $note : '');
                neximatrix_create_notification($pdo, (int) $withdrawalData['user_id'], $wTitle, $wMsg, 'withdrawal');
            }
            neximatrix_success(['updated' => true]);
            // no break

        case 'admin/finance/adjust':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $input = neximatrix_input();
            $userId = (int) ($input['user_id'] ?? 0);
            $amount = (float) ($input['amount'] ?? 0);
            $type = (string) ($input['type'] ?? 'credit');
            $description = neximatrix_string($input['description'] ?? '', 1, 255);
            if ($userId < 1 || $amount <= 0) {
                neximatrix_http_error('User ID and amount are required.', 422);
            }
            $pdo = neximatrix_db();
            $targetUser = neximatrix_user_by_id($pdo, $userId);
            neximatrix_admin_adjust_balance($pdo, $userId, $amount, $type, $description);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.balance.adjusted', 'user', $userId, ['amount' => $amount, 'type' => $type]);
            if ($targetUser !== null && $type === 'credit') {
                NeximatrixMailService::sendTopupBalanceNotification((string) $targetUser['email'], (string) $targetUser['full_name'], $amount);
            }
            neximatrix_success(['adjusted' => true]);
            // no break

        case 'admin/finance/process-profits':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $processed = neximatrix_process_daily_profits(neximatrix_db());
            neximatrix_log_activity(neximatrix_db(), $admin['id'], 'admin', 'admin.profits.processed', 'investment', null, ['count' => $processed]);
            neximatrix_success(['processed' => $processed]);
            // no break

        // ─── Admin Overview & System ─────────────────────────────────────

        case 'admin/overview/stats':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_success(['stats' => neximatrix_admin_overview_stats(neximatrix_db())]);
            // no break

        case 'admin/system/health':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_success(['health' => neximatrix_admin_system_health(neximatrix_db())]);
            // no break

        case 'admin/recent-users':
            neximatrix_method('GET');
            neximatrix_require_admin();
            $limit = min(20, max(1, neximatrix_query_int('limit', 5)));
            neximatrix_success(['users' => neximatrix_admin_recent_users(neximatrix_db(), $limit)]);
            // no break

        case 'admin/recent-tickets':
            neximatrix_method('GET');
            neximatrix_require_admin();
            $limit = min(20, max(1, neximatrix_query_int('limit', 5)));
            neximatrix_success(['tickets' => neximatrix_admin_recent_tickets(neximatrix_db(), $limit)]);
            // no break

        case 'admin/settings/all':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'settings.general');
            neximatrix_success(['settings' => neximatrix_get_all_settings(neximatrix_db())]);
            // no break

        case 'admin/settings/update':
            neximatrix_method('PATCH');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            $pdo = neximatrix_db();
            neximatrix_require_permission($pdo, $admin, 'settings.general');
            $settings = neximatrix_update_settings($pdo, neximatrix_input(), $admin['id']);
            neximatrix_success(['settings' => $settings]);
            // no break

        case 'admin/content/pages':
            neximatrix_method('GET', 'POST');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'content.view');
                $pages = $pdo->query('SELECT id, slug, title, status, updated_at FROM content_pages ORDER BY title')->fetchAll();
                neximatrix_success(['pages' => $pages]);
            }
            neximatrix_require_csrf();
            neximatrix_require_permission($pdo, $admin, 'content.create');
            $input = neximatrix_input();
            $slug = neximatrix_string($input['slug'] ?? '', 3, 100);
            $title = neximatrix_string($input['title'] ?? '', 2, 190);
            if ($slug === '' || $title === '') {
                neximatrix_http_error('Slug and title are required.', 422);
            }
            $stmt = $pdo->prepare('INSERT INTO content_pages (slug, title, body, status, published_at) VALUES (:slug, :title, :body, :status, :published_at)');
            $stmt->execute([
                ':slug' => $slug,
                ':title' => $title,
                ':body' => neximatrix_string($input['body'] ?? '', 0, 50000),
                ':status' => in_array($input['status'] ?? '', ['draft', 'published'], true) ? $input['status'] : 'draft',
                ':published_at' => ($input['status'] ?? '') === 'published' ? gmdate('Y-m-d H:i:s') : null,
            ]);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.content.page_created', 'content_page', (int) $pdo->lastInsertId());
            neximatrix_success(['page' => ['id' => (int) $pdo->lastInsertId(), 'slug' => $slug, 'title' => $title]], 201);
            // no break

        case 'admin/content/news':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'content.view');
            $articles = neximatrix_db()->query('SELECT id, title, slug, status, published_at FROM news_articles ORDER BY created_at DESC')->fetchAll();
            neximatrix_success(['articles' => $articles]);
            // no break

        case 'admin/content/faqs':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'content.view');
            $faqs = neximatrix_db()->query('SELECT id, question, answer, sort_order, is_active FROM faqs ORDER BY sort_order')->fetchAll();
            neximatrix_success(['faqs' => $faqs]);
            // no break

        case 'admin/security/login-history':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'security.view');
            $limit = min(100, max(1, neximatrix_query_int('limit', 20)));
            $stmt = neximatrix_db()->prepare('SELECT id, identifier, success, ip_address, created_at FROM login_attempts ORDER BY created_at DESC LIMIT :limit');
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            neximatrix_success(['attempts' => $stmt->fetchAll()]);
            // no break

        case 'admin/security/events':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'security.view');
            $limit = min(100, max(1, neximatrix_query_int('limit', 50)));
            $stmt = neximatrix_db()->prepare('SELECT id, event_type, created_at FROM security_events ORDER BY created_at DESC LIMIT :limit');
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            neximatrix_success(['events' => $stmt->fetchAll()]);
            // no break

        case 'admin/system/logs':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'system.view');
            $limit = min(100, max(1, neximatrix_query_int('limit', 50)));
            $stmt = neximatrix_db()->prepare('SELECT id, level, channel, message, created_at FROM system_logs ORDER BY created_at DESC LIMIT :limit');
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            neximatrix_success(['logs' => $stmt->fetchAll()]);
            // no break

        case 'admin/communication/contact':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'support.view');
            $submissions = neximatrix_db()->query('SELECT id, name, email, subject, is_read, created_at FROM contact_submissions ORDER BY created_at DESC')->fetchAll();
            neximatrix_success(['submissions' => $submissions]);
            // no break

        case 'admin/communication/subscriptions':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'email.send');
            $subs = neximatrix_db()->query('SELECT id, email, is_subscribed, created_at FROM newsletter_subscriptions ORDER BY created_at DESC')->fetchAll();
            neximatrix_success(['subscribers' => $subs]);
            // no break

        case 'admin/user-detail':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'users.view');
            $userId = neximatrix_query_int('id');
            $user = neximatrix_user_by_id(neximatrix_db(), $userId);
            if ($user === null) {
                neximatrix_http_error('User not found.', 404);
            }
            $roles = neximatrix_user_roles(neximatrix_db(), $userId);
            $stmt = neximatrix_db()->prepare('SELECT COUNT(*) FROM support_tickets WHERE user_id = :user_id AND status IN ("open", "in_progress", "waiting_for_user")');
            $stmt->execute([':user_id' => $userId]);
            $openTickets = (int) $stmt->fetchColumn();
            $stmt = neximatrix_db()->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL');
            $stmt->execute([':user_id' => $userId]);
            $unreadNotifs = (int) $stmt->fetchColumn();
            $stmt = neximatrix_db()->prepare('SELECT id, action, entity_type, entity_id, created_at FROM activity_logs WHERE actor_user_id = :user_id ORDER BY created_at DESC LIMIT 10');
            $stmt->execute([':user_id' => $userId]);
            $activity = $stmt->fetchAll();
            $stmt = neximatrix_db()->prepare('SELECT un.id, un.note, un.created_at, u.full_name AS admin_name FROM user_notes un INNER JOIN users u ON u.id = un.admin_id WHERE un.user_id = :user_id ORDER BY un.created_at DESC');
            $stmt->execute([':user_id' => $userId]);
            $notes = $stmt->fetchAll();
            neximatrix_success(['detail' => [
                'user' => neximatrix_user_dto($user, $roles),
                'openSupportTickets' => $openTickets,
                'unreadNotifications' => $unreadNotifs,
                'recentActivity' => $activity,
                'notes' => $notes,
            ]]);
            // no break

        case 'admin/user-notes':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'users.notes');
            $input = neximatrix_input();
            $userId = (int) ($input['user_id'] ?? 0);
            $note = neximatrix_string($input['note'] ?? '', 1, 5000);
            if ($userId < 1 || $note === '') {
                neximatrix_http_error('User ID and note are required.', 422);
            }
            $pdo = neximatrix_db();
            $stmt = $pdo->prepare('INSERT INTO user_notes (user_id, admin_id, note) VALUES (:user_id, :admin_id, :note)');
            $stmt->execute([':user_id' => $userId, ':admin_id' => $admin['id'], ':note' => $note]);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.user.note_added', 'user', $userId);
            neximatrix_success(['note' => ['id' => (int) $pdo->lastInsertId(), 'note' => $note, 'created_at' => gmdate('Y-m-d H:i:s')]], 201);
            // no break

        case 'admin/records':
            neximatrix_method('GET');
            neximatrix_require_admin();
            [$page, $limit, $offset] = neximatrix_page_params();
            $type = neximatrix_query_string('type');
            $pdo = neximatrix_db();
            $where = '1 = 1';
            $params = [];
            if ($type !== '' && in_array($type, ['deposit', 'withdrawal', 'investment', 'profit', 'referral_bonus', 'adjustment'], true)) {
                $where .= ' AND type = :type';
                $params[':type'] = $type;
            }
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM transactions WHERE {$where}");
            $countStmt->execute($params);
            $total = (int) $countStmt->fetchColumn();
            $stmt = $pdo->prepare("SELECT id, user_id, type, amount, fee, balance_before, balance_after, description, status, created_at FROM transactions WHERE {$where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
            foreach ($params as $k => $v) $stmt->bindValue($k, $v);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            neximatrix_success(['records' => ['items' => $stmt->fetchAll(), 'total' => $total, 'page' => $page]]);
            // no break

        case 'admin/administration/admins':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'admins.manage');
            $pdo = neximatrix_db();
            $stmt = $pdo->query(
                'SELECT u.id, u.full_name, u.username, u.email, GROUP_CONCAT(ar.name ORDER BY ar.name SEPARATOR ",") AS roles
                 FROM users u
                 INNER JOIN admin_user_roles aur ON aur.user_id = u.id
                 INNER JOIN admin_roles ar ON ar.id = aur.role_id
                 GROUP BY u.id ORDER BY u.username'
            );
            $admins = [];
            foreach ($stmt->fetchAll() as $row) {
                $admins[] = ['id' => (int) $row['id'], 'full_name' => $row['full_name'], 'username' => $row['username'], 'email' => $row['email'], 'roles' => $row['roles'] ? explode(',', $row['roles']) : []];
            }
            neximatrix_success(['admins' => $admins]);
            // no break

        case 'admin/administration/roles':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'admins.manage');
            $pdo = neximatrix_db();
            $stmt = $pdo->query(
                'SELECT ar.id, ar.name, ar.description, COUNT(arp.permission_id) AS permission_count
                 FROM admin_roles ar
                 LEFT JOIN admin_role_permissions arp ON arp.role_id = ar.id
                 GROUP BY ar.id ORDER BY ar.name'
            );
            neximatrix_success(['roles' => $stmt->fetchAll()]);
            // no break

        case 'admin/administration/assign-role':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'admins.assign');
            $input = neximatrix_input();
            $userId = (int) ($input['user_id'] ?? 0);
            $roleId = (int) ($input['role_id'] ?? 0);
            if ($userId < 1 || $roleId < 1) {
                neximatrix_http_error('User ID and role ID are required.', 422);
            }
            neximatrix_assign_admin_role(neximatrix_db(), $userId, $roleId, $admin['id']);
            neximatrix_success(['assigned' => true]);
            // no break

        case 'admin/administration/remove-role':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'admins.assign');
            $input = neximatrix_input();
            $userId = (int) ($input['user_id'] ?? 0);
            $roleId = (int) ($input['role_id'] ?? 0);
            if ($userId < 1 || $roleId < 1) {
                neximatrix_http_error('User ID and role ID are required.', 422);
            }
            neximatrix_remove_admin_role(neximatrix_db(), $userId, $roleId, $admin['id']);
            neximatrix_success(['removed' => true]);
            // no break

        // ─── User Management ────────────────────────────────────────────

        case 'admin/users/list':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'users.view');
            [$page, $limit, $offset] = neximatrix_page_params();
            $result = neximatrix_admin_user_list(
                neximatrix_db(),
                neximatrix_query_string('search'),
                neximatrix_query_string('status'),
                $limit,
                $offset
            );
            $result['page'] = $page;
            neximatrix_success(['users' => $result]);
            // no break

        case 'admin/users/update':
            neximatrix_method('PATCH');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'users.edit');
            $userId = neximatrix_query_int('id');
            $updated = neximatrix_admin_user_update(neximatrix_db(), $userId, neximatrix_input(), $admin['id']);
            neximatrix_success(['user' => $updated]);
            // no break

        case 'admin/users/status':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'users.status');
            $input = neximatrix_input();
            $userId = (int) ($input['user_id'] ?? 0);
            $status = (string) ($input['status'] ?? '');
            neximatrix_admin_user_status(neximatrix_db(), $userId, $status, $admin['id']);
            neximatrix_success(['updated' => true]);
            // no break

        case 'admin/users/notes':
            neximatrix_method('GET', 'POST');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            $userId = neximatrix_query_int('id');
            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'users.notes');
                neximatrix_success(['notes' => neximatrix_admin_user_notes_list($pdo, $userId)]);
            }
            neximatrix_require_csrf();
            neximatrix_require_permission($pdo, $admin, 'users.notes');
            $input = neximatrix_input();
            $note = neximatrix_string($input['note'] ?? '', 1, 5000);
            if ($note === '') {
                neximatrix_http_error('Note is required.', 422);
            }
            $result = neximatrix_admin_user_notes_add($pdo, $userId, $admin['id'], $note);
            neximatrix_success(['note' => $result], 201);
            // no break

        case 'admin/security/login-history':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'security.view');
            $userId = neximatrix_query_int('user_id') ?: null;
            $limit = min(100, max(1, neximatrix_query_int('limit', 20)));
            neximatrix_success(['attempts' => neximatrix_admin_login_history(neximatrix_db(), $userId, $limit)]);
            // no break

        case 'admin/security/events':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'security.view');
            $limit = min(100, max(1, neximatrix_query_int('limit', 50)));
            neximatrix_success(['events' => neximatrix_admin_security_events_list(neximatrix_db(), $limit)]);
            // no break

        case 'admin/audit-log':
            neximatrix_method('GET');
            neximatrix_require_admin();
            [$page, $limit, $offset] = neximatrix_page_params();
            $result = neximatrix_admin_audit_log(neximatrix_db(), $limit, $offset);
            $result['page'] = $page;
            neximatrix_success(['audit' => $result]);
            // no break

        // ─── Support Management ──────────────────────────────────────────

        case 'admin/support/list':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'support.view');
            [$page, $limit, $offset] = neximatrix_page_params();
            $result = neximatrix_admin_support_list(
                neximatrix_db(),
                neximatrix_query_string('search'),
                neximatrix_query_string('status'),
                $limit,
                $offset
            );
            $result['page'] = $page;
            neximatrix_success(['tickets' => $result]);
            // no break

        case 'admin/support/ticket':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'support.view');
            $ticket = neximatrix_admin_support_ticket(neximatrix_db(), neximatrix_query_int('id'));
            if ($ticket === null) {
                neximatrix_http_error('Support ticket not found.', 404);
            }
            neximatrix_success(['ticket' => $ticket]);
            // no break

        case 'admin/support/reply':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'support.reply');
            $input = neximatrix_input();
            $ticketId = (int) ($input['ticket_id'] ?? 0);
            $body = neximatrix_string($input['message'] ?? '', 1, 10000);
            $internal = filter_var($input['internal'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($internal === null) {
                neximatrix_http_error('Invalid internal flag.', 422);
            }
            $ticket = neximatrix_admin_support_reply(neximatrix_db(), $ticketId, $admin['id'], $body, $internal);
            neximatrix_success(['ticket' => $ticket]);
            // no break

        case 'admin/support/status':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'support.status');
            $input = neximatrix_input();
            $ticketId = (int) ($input['ticket_id'] ?? 0);
            $status = (string) ($input['status'] ?? '');
            neximatrix_admin_support_status(neximatrix_db(), $ticketId, $status, $admin['id']);
            neximatrix_success(['updated' => true]);
            // no break

        case 'admin/support/priority':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'support.status');
            $input = neximatrix_input();
            $ticketId = (int) ($input['ticket_id'] ?? 0);
            $priority = (string) ($input['priority'] ?? '');
            neximatrix_admin_support_priority(neximatrix_db(), $ticketId, $priority, $admin['id']);
            neximatrix_success(['updated' => true]);
            // no break

        case 'admin/support/assign':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'support.status');
            $input = neximatrix_input();
            $ticketId = (int) ($input['ticket_id'] ?? 0);
            $assigneeId = (int) ($input['assigned_to'] ?? 0);
            neximatrix_admin_support_assign(neximatrix_db(), $ticketId, $assigneeId, $admin['id']);
            neximatrix_success(['updated' => true]);
            // no break

        case 'admin/support/assignees':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'support.view');
            neximatrix_success(['assignees' => neximatrix_admin_support_assignees_list(neximatrix_db())]);
            // no break

        // ─── Notifications & Announcements ───────────────────────────────

        case 'admin/notifications/list':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'notifications.create');
            $limit = min(100, max(1, neximatrix_query_int('limit', 50)));
            neximatrix_success(['notifications' => neximatrix_admin_notifications_list(neximatrix_db(), $limit)]);
            // no break

        case 'admin/announcements':
            neximatrix_method('GET', 'POST');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'notifications.create');
                neximatrix_success(['announcements' => neximatrix_admin_announcements_list($pdo)]);
            }
            neximatrix_require_csrf();
            neximatrix_require_permission($pdo, $admin, 'notifications.create');
            $input = neximatrix_input();
            $title = neximatrix_string($input['title'] ?? '', 2, 190);
            $message = neximatrix_string($input['message'] ?? '', 1, 5000);
            $dismissible = filter_var($input['is_dismissible'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($dismissible === null) $dismissible = true;
            if ($title === '' || $message === '') {
                neximatrix_http_error('Title and message are required.', 422);
            }
            $startsAt = !empty($input['starts_at']) ? neximatrix_string($input['starts_at'], 1, 19) : null;
            $endsAt = !empty($input['ends_at']) ? neximatrix_string($input['ends_at'], 1, 19) : null;
            $result = neximatrix_admin_announcement_create($pdo, $title, $message, $dismissible, $startsAt, $endsAt, $admin['id']);
            neximatrix_success(['announcement' => $result], 201);
            // no break

        case 'admin/communication/mark-read':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'support.view');
            $input = neximatrix_input();
            $submissionId = (int) ($input['id'] ?? 0);
            if ($submissionId < 1) {
                neximatrix_http_error('Submission ID is required.', 422);
            }
            neximatrix_admin_contact_mark_read(neximatrix_db(), $submissionId, $admin['id']);
            neximatrix_success(['updated' => true]);
            // no break

        // ─── Content Management ──────────────────────────────────────────

        case 'admin/content/page':
            neximatrix_method('GET', 'POST', 'PATCH', 'DELETE');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            $pageId = neximatrix_query_int('id');

            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'content.view');
                if ($pageId > 0) {
                    $page = neximatrix_admin_content_page_get($pdo, $pageId);
                    if ($page === null) neximatrix_http_error('Page not found.', 404);
                    neximatrix_success(['page' => $page]);
                } else {
                    neximatrix_success(['pages' => neximatrix_admin_content_pages_list($pdo)]);
                }
            }

            neximatrix_require_csrf();
            $input = neximatrix_input();

            if ($method === 'POST') {
                neximatrix_require_permission($pdo, $admin, 'content.create');
                $slug = neximatrix_string($input['slug'] ?? '', 3, 100);
                $title = neximatrix_string($input['title'] ?? '', 2, 190);
                if ($slug === '' || $title === '') neximatrix_http_error('Slug and title are required.', 422);
                $page = neximatrix_admin_content_page_create($pdo, $slug, $title, neximatrix_string($input['body'] ?? '', 0, 50000), in_array($input['status'] ?? '', ['draft', 'published'], true) ? $input['status'] : 'draft', $admin['id']);
                neximatrix_success(['page' => $page], 201);
            }

            neximatrix_require_permission($pdo, $admin, 'content.edit');
            if ($method === 'PATCH') {
                if ($pageId < 1) neximatrix_http_error('Page ID is required.', 422);
                $page = neximatrix_admin_content_page_update($pdo, $pageId, $input, $admin['id']);
                neximatrix_success(['page' => $page]);
            }
            if ($method === 'DELETE') {
                if ($pageId < 1) neximatrix_http_error('Page ID is required.', 422);
                neximatrix_admin_content_page_delete($pdo, $pageId, $admin['id']);
                neximatrix_success(['deleted' => true]);
            }
            // no break

        case 'admin/content/news-detail':
            neximatrix_method('GET', 'POST');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'content.view');
                neximatrix_success(['articles' => neximatrix_admin_news_list($pdo)]);
            }
            neximatrix_require_csrf();
            neximatrix_require_permission($pdo, $admin, 'content.create');
            $input = neximatrix_input();
            $title = neximatrix_string($input['title'] ?? '', 2, 190);
            $slug = neximatrix_string($input['slug'] ?? '', 3, 190);
            if ($title === '' || $slug === '') neximatrix_http_error('Title and slug are required.', 422);
            $article = neximatrix_admin_news_create($pdo, $title, $slug, neximatrix_string($input['excerpt'] ?? '', 0, 500), neximatrix_string($input['body'] ?? '', 0, 50000), in_array($input['status'] ?? '', ['draft', 'published'], true) ? $input['status'] : 'draft', $admin['id']);
            neximatrix_success(['article' => $article], 201);
            // no break

        case 'admin/content/faq-detail':
            neximatrix_method('GET', 'POST', 'PATCH', 'DELETE');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            $faqId = neximatrix_query_int('id');

            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'content.view');
                neximatrix_success(['faqs' => neximatrix_admin_faqs_list($pdo)]);
            }

            neximatrix_require_csrf();
            $input = neximatrix_input();

            if ($method === 'POST') {
                neximatrix_require_permission($pdo, $admin, 'content.create');
                $question = neximatrix_string($input['question'] ?? '', 3, 500);
                $answer = neximatrix_string($input['answer'] ?? '', 0, 10000);
                if ($question === '') neximatrix_http_error('Question is required.', 422);
                $faq = neximatrix_admin_faq_create($pdo, $question, $answer, (int) ($input['sort_order'] ?? 0), $admin['id']);
                neximatrix_success(['faq' => $faq], 201);
            }

            neximatrix_require_permission($pdo, $admin, 'content.edit');
            if ($method === 'PATCH') {
                if ($faqId < 1) neximatrix_http_error('FAQ ID is required.', 422);
                neximatrix_admin_faq_update($pdo, $faqId, $input, $admin['id']);
                neximatrix_success(['updated' => true]);
            }
            if ($method === 'DELETE') {
                if ($faqId < 1) neximatrix_http_error('FAQ ID is required.', 422);
                neximatrix_admin_faq_delete($pdo, $faqId, $admin['id']);
                neximatrix_success(['deleted' => true]);
            }
            // no break

        // ─── Email Delivery Logs ──────────────────────────────────────────

        case 'admin/email/logs':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'email.templates');
            $limit = min(100, max(1, neximatrix_query_int('limit', 50)));
            neximatrix_success(['logs' => neximatrix_admin_email_logs(neximatrix_db(), $limit)]);
            // no break

        // ─── Security Settings ───────────────────────────────────────────

        case 'admin/security/failed-logins':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'security.view');
            $hours = min(168, max(1, neximatrix_query_int('hours', 24)));
            neximatrix_success(['failed' => neximatrix_admin_security_failed_logins(neximatrix_db(), $hours)]);
            // no break

        // ─── System Utilities ────────────────────────────────────────────

        case 'admin/system/info':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'system.view');
            neximatrix_success(['info' => neximatrix_admin_system_info(neximatrix_db())]);
            // no break

        case 'admin/system/health':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'system.view');
            neximatrix_success(['checks' => neximatrix_admin_system_health_check(neximatrix_db())]);
            // no break

        case 'admin/system/backup':
            neximatrix_method('GET', 'POST');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'system.backup');
                neximatrix_success(['backups' => neximatrix_admin_backup_list($pdo)]);
            }
            neximatrix_require_csrf();
            neximatrix_require_permission($pdo, $admin, 'system.backup');
            $result = neximatrix_admin_backup_create($pdo, $admin['id']);
            neximatrix_success(['backup' => $result], 201);
            // no break

        case 'admin/system/diagnostics':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'system.view');
            neximatrix_success(['diagnostics' => neximatrix_admin_diagnostics(neximatrix_db())]);
            // no break

        case 'admin/system/scheduled-tasks':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'system.view');
            neximatrix_success(['tasks' => neximatrix_admin_scheduled_tasks_list(neximatrix_db())]);
            // no break

        // ─── Referral Settings ─────────────────────────────────────────

        case 'admin/referral/settings':
            neximatrix_method('GET', 'PATCH');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'settings.general');
                neximatrix_success(['settings' => neximatrix_admin_referral_settings_get_all($pdo)]);
            }
            neximatrix_require_csrf();
            neximatrix_require_permission($pdo, $admin, 'settings.general');
            $settings = neximatrix_admin_referral_settings_update($pdo, neximatrix_input(), $admin['id']);
            neximatrix_success(['settings' => $settings]);
            // no break

        case 'admin/referral/stats':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'settings.general');
            neximatrix_success(['stats' => neximatrix_admin_referral_stats(neximatrix_db())]);
            // no break

        case 'admin/referral/event-logs':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'settings.general');
            $limit = min(100, max(1, neximatrix_query_int('limit', 50)));
            neximatrix_success(['logs' => neximatrix_admin_referral_event_logs(neximatrix_db(), $limit)]);
            // no break

        // ─── Payment Methods ────────────────────────────────────────────

        case 'admin/payment-methods':
            neximatrix_method('GET', 'POST', 'PATCH', 'DELETE');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            $methodId = neximatrix_query_int('id');
            $action = neximatrix_query_string('action');

            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'settings.general');
                neximatrix_success(['methods' => neximatrix_admin_payment_methods_list($pdo)]);
            }

            neximatrix_require_csrf();

            if ($method === 'POST') {
                neximatrix_require_permission($pdo, $admin, 'settings.general');
                if ($action === 'restore') {
                    if ($methodId < 1) neximatrix_http_error('Payment method ID is required.', 422);
                    $method = neximatrix_admin_payment_method_restore($pdo, $methodId, $admin['id']);
                    neximatrix_success(['method' => $method]);
                }
                $method = neximatrix_admin_payment_method_create($pdo, neximatrix_input(), $admin['id']);
                neximatrix_success(['method' => $method], 201);
            }

            neximatrix_require_permission($pdo, $admin, 'settings.general');
            if ($method === 'PATCH') {
                if ($methodId < 1) neximatrix_http_error('Payment method ID is required.', 422);
                $method = neximatrix_admin_payment_method_update($pdo, $methodId, neximatrix_input(), $admin['id']);
                neximatrix_success(['method' => $method]);
            }
            if ($method === 'DELETE') {
                if ($methodId < 1) neximatrix_http_error('Payment method ID is required.', 422);
                neximatrix_admin_payment_method_archive($pdo, $methodId, $admin['id']);
                neximatrix_success(['archived' => true]);
            }
            // no break

        // ─── Bonus Management ────────────────────────────────────────────

        case 'admin/bonuses':
            neximatrix_method('GET', 'POST', 'PATCH', 'DELETE');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            $bonusId = neximatrix_query_int('id');
            $action = neximatrix_query_string('action');

            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'settings.general');
                neximatrix_success(['bonuses' => neximatrix_admin_bonuses_list($pdo)]);
            }

            neximatrix_require_csrf();

            if ($method === 'POST') {
                neximatrix_require_permission($pdo, $admin, 'settings.general');
                if ($action === 'toggle') {
                    if ($bonusId < 1) neximatrix_http_error('Bonus ID is required.', 422);
                    $bonus = neximatrix_admin_bonus_toggle($pdo, $bonusId, $admin['id']);
                    neximatrix_success(['bonus' => $bonus]);
                }
                $bonus = neximatrix_admin_bonus_create($pdo, neximatrix_input(), $admin['id']);
                neximatrix_success(['bonus' => $bonus], 201);
            }

            neximatrix_require_permission($pdo, $admin, 'settings.general');
            if ($method === 'PATCH') {
                if ($bonusId < 1) neximatrix_http_error('Bonus ID is required.', 422);
                $bonus = neximatrix_admin_bonus_update($pdo, $bonusId, neximatrix_input(), $admin['id']);
                neximatrix_success(['bonus' => $bonus]);
            }
            if ($method === 'DELETE') {
                if ($bonusId < 1) neximatrix_http_error('Bonus ID is required.', 422);
                neximatrix_admin_bonus_delete($pdo, $bonusId, $admin['id']);
                neximatrix_success(['deleted' => true]);
            }
            // no break

        // ─── Content Expansion ──────────────────────────────────────────

        case 'admin/content/homepage':
            neximatrix_method('GET', 'PATCH');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();

            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'content.view');
                neximatrix_success(['sections' => neximatrix_admin_homepage_sections_list($pdo)]);
            }

            neximatrix_require_csrf();
            neximatrix_require_permission($pdo, $admin, 'content.edit');
            $sectionId = neximatrix_query_int('id');
            if ($sectionId < 1) neximatrix_http_error('Section ID is required.', 422);
            $section = neximatrix_admin_homepage_section_update($pdo, $sectionId, neximatrix_input(), $admin['id']);
            neximatrix_success(['section' => $section]);
            // no break

        case 'admin/content/banners':
            neximatrix_method('GET', 'POST', 'PATCH', 'DELETE');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            $bannerId = neximatrix_query_int('id');

            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'content.view');
                neximatrix_success(['banners' => neximatrix_admin_banners_list($pdo)]);
            }

            neximatrix_require_csrf();

            if ($method === 'POST') {
                neximatrix_require_permission($pdo, $admin, 'content.create');
                $banner = neximatrix_admin_banner_create($pdo, neximatrix_input(), $admin['id']);
                neximatrix_success(['banner' => $banner], 201);
            }

            neximatrix_require_permission($pdo, $admin, 'content.edit');
            if ($method === 'PATCH') {
                if ($bannerId < 1) neximatrix_http_error('Banner ID is required.', 422);
                $banner = neximatrix_admin_banner_update($pdo, $bannerId, neximatrix_input(), $admin['id']);
                neximatrix_success(['banner' => $banner]);
            }
            if ($method === 'DELETE') {
                if ($bannerId < 1) neximatrix_http_error('Banner ID is required.', 422);
                neximatrix_admin_banner_delete($pdo, $bannerId, $admin['id']);
                neximatrix_success(['deleted' => true]);
            }
            // no break

        // ─── Public Payment Methods ─────────────────────────────────────────

        case 'payment-methods/public':
            neximatrix_method('GET');
            $pdo = neximatrix_db();
            $methods = $pdo->query(
                "SELECT method_key, display_name, description, public_instructions, supported_currencies, wallet_address
                 FROM payment_method_display_configs
                 WHERE is_enabled = 1 AND status = 'active'
                 ORDER BY display_order"
            )->fetchAll();
            neximatrix_success(['methods' => $methods]);
            // no break

        // ─── User Search (by username) ─────────────────────────────────────

        case 'admin/user-search':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'users.view');
            $search = neximatrix_query_string('q');
            if ($search === '') {
                neximatrix_http_error('Search query is required.', 422);
            }
            $stmt = neximatrix_db()->prepare(
                'SELECT id, username, full_name, email, status FROM users WHERE username LIKE :search1 OR full_name LIKE :search2 OR email LIKE :search3 ORDER BY username LIMIT 10'
            );
            $stmt->execute([':search1' => '%' . $search . '%', ':search2' => '%' . $search . '%', ':search3' => '%' . $search . '%']);
            $users = $stmt->fetchAll();
            neximatrix_success(['users' => $users, 'user' => $users[0] ?? null]);
            // no break

        // ─── Blacklist Management ─────────────────────────────────────────

        case 'admin/blacklist':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'users.view');
            $blacklist = neximatrix_db()->query(
                'SELECT ab.id, ab.user_id, ab.reason, ab.created_at, u.username, u.full_name, u.email
                 FROM account_blacklist ab INNER JOIN users u ON u.id = ab.user_id
                 ORDER BY ab.created_at DESC'
            )->fetchAll();
            neximatrix_success(['blacklist' => $blacklist]);
            // no break

        case 'admin/blacklist/add':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'users.status');
            $input = neximatrix_input();
            $userId = (int) ($input['user_id'] ?? 0);
            $reason = neximatrix_string($input['reason'] ?? '', 3, 500);
            if ($userId < 1 || $reason === '') {
                neximatrix_http_error('User ID and reason are required.', 422);
            }
            $pdo = neximatrix_db();
            $user = neximatrix_user_by_id($pdo, $userId);
            if ($user === null) {
                neximatrix_http_error('User not found.', 404);
            }
            $exists = $pdo->prepare('SELECT id FROM account_blacklist WHERE user_id = :user_id LIMIT 1');
            $exists->execute([':user_id' => $userId]);
            if ($exists->fetchColumn() !== false) {
                neximatrix_http_error('User is already blacklisted.', 409);
            }
            $pdo->prepare('INSERT INTO account_blacklist (user_id, reason, blacklisted_by) VALUES (:user_id, :reason, :admin_id)')
                ->execute([':user_id' => $userId, ':reason' => $reason, ':admin_id' => $admin['id']]);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.blacklist.added', 'user', $userId);
            neximatrix_success(['added' => true], 201);
            // no break

        case 'admin/blacklist/remove':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'users.status');
            $input = neximatrix_input();
            $userId = (int) ($input['user_id'] ?? 0);
            if ($userId < 1) {
                neximatrix_http_error('User ID is required.', 422);
            }
            $pdo = neximatrix_db();
            $pdo->prepare('DELETE FROM account_blacklist WHERE user_id = :user_id')->execute([':user_id' => $userId]);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.blacklist.removed', 'user', $userId);
            neximatrix_success(['removed' => true]);
            // no break

        // ─── Exchange Rates ────────────────────────────────────────────────

        case 'admin/exchange-rates':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'settings.general');
            $rates = neximatrix_db()->query('SELECT * FROM exchange_rates ORDER BY currency_code')->fetchAll();
            neximatrix_success(['rates' => $rates]);
            // no break

        case 'admin/exchange-rates/update':
            neximatrix_method('PATCH');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'settings.general');
            $input = neximatrix_input();
            $pdo = neximatrix_db();
            $rates = $pdo->query('SELECT * FROM exchange_rates ORDER BY currency_code')->fetchAll();
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.exchange_rates.updated', 'exchange_rate', null);
            if (isset($input['currency_code']) && isset($input['rate'])) {
                $currency = neximatrix_string($input['currency_code'], 3, 10);
                $rate = (float) $input['rate'];
                if ($currency !== '' && $rate > 0) {
                    NeximatrixMailService::notifyAdmins('exchange_admin', 'Exchange rate updated', "Exchange rate for {$currency} was updated to {$rate}.");
                }
            }
            neximatrix_success(['rates' => $rates]);
            // no break

        // ─── Earning Holidays ──────────────────────────────────────────────

        case 'admin/earning-holidays':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'settings.general');
            $holidays = neximatrix_db()->query('SELECT * FROM earning_holidays ORDER BY start_date DESC')->fetchAll();
            neximatrix_success(['holidays' => $holidays]);
            // no break

        case 'admin/earning-holidays/create':
            neximatrix_method('POST');
            $admin = neximatrix_require_admin();
            neximatrix_require_csrf();
            neximatrix_require_permission(neximatrix_db(), $admin, 'settings.general');
            $input = neximatrix_input();
            $name = neximatrix_string($input['name'] ?? '', 2, 120);
            $startDate = neximatrix_string($input['start_date'] ?? '', 10, 10);
            $endDate = neximatrix_string($input['end_date'] ?? '', 10, 10);
            if ($name === '' || $startDate === '' || $endDate === '') {
                neximatrix_http_error('Name, start date, and end date are required.', 422);
            }
            $pdo = neximatrix_db();
            $stmt = $pdo->prepare('INSERT INTO earning_holidays (name, description, start_date, end_date, created_by) VALUES (:name, :description, :start_date, :end_date, :created_by)');
            $stmt->execute([
                ':name' => $name,
                ':description' => neximatrix_string($input['description'] ?? '', 0, 500),
                ':start_date' => $startDate,
                ':end_date' => $endDate,
                ':created_by' => $admin['id'],
            ]);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.holiday.created', 'earning_holiday', (int) $pdo->lastInsertId());
            neximatrix_success(['id' => (int) $pdo->lastInsertId()], 201);
            // no break

        // ─── Auto-Withdrawal Settings ──────────────────────────────────────

        case 'admin/auto-withdrawal/settings':
            neximatrix_method('GET', 'PATCH');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'settings.general');
                $settings = [];
                foreach ($pdo->query('SELECT setting_key, setting_value, value_type, description FROM auto_withdrawal_settings ORDER BY setting_key')->fetchAll() as $row) {
                    $settings[$row['setting_key']] = ['value' => $row['setting_value'], 'type' => $row['value_type'], 'description' => $row['description']];
                }
                neximatrix_success(['settings' => $settings]);
            }
            neximatrix_require_csrf();
            neximatrix_require_permission($pdo, $admin, 'settings.general');
            $input = neximatrix_input();
            $allowed = ['auto_withdraw_enabled', 'auto_withdraw_min_amount', 'auto_withdraw_max_amount', 'auto_withdraw_review_required', 'auto_withdraw_status_label', 'auto_withdraw_notification'];
            $filtered = array_intersect_key($input, array_flip($allowed));
            if ($filtered === []) {
                neximatrix_http_error('No permitted settings were supplied.', 422);
            }
            $stmt = $pdo->prepare(
                'INSERT INTO auto_withdrawal_settings (setting_key, setting_value, value_type, updated_by)
                 VALUES (:key, :value, :type, :admin_id)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = UTC_TIMESTAMP()'
            );
            foreach ($filtered as $key => $value) {
                $type = is_numeric($value) && !str_contains((string)$value, '.') ? 'number' : (in_array((string)$value, ['0', '1'], true) ? 'boolean' : 'text');
                $stmt->execute([':key' => $key, ':value' => neximatrix_string((string)$value, 0, 5000), ':type' => $type, ':admin_id' => $admin['id']]);
            }
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.auto_withdrawal.updated', 'auto_withdrawal_setting', null);
            neximatrix_success(['updated' => true]);
            // no break

        // ─── Info Boxes ────────────────────────────────────────────────────

        case 'admin/info-boxes':
            neximatrix_method('GET', 'POST', 'PATCH', 'DELETE');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'content.view');
                $boxes = $pdo->query('SELECT * FROM info_boxes ORDER BY created_at DESC')->fetchAll();
                neximatrix_success(['boxes' => $boxes]);
            }
            if ($method === 'POST') {
                neximatrix_require_csrf();
                neximatrix_require_permission($pdo, $admin, 'content.create');
                $input = neximatrix_input();
                $title = neximatrix_string($input['title'] ?? '', 2, 190);
                $message = neximatrix_string($input['message'] ?? '', 1, 5000);
                if ($title === '' || $message === '') {
                    neximatrix_http_error('Title and message are required.', 422);
                }
                $stmt = $pdo->prepare('INSERT INTO info_boxes (title, message, box_type, display_location, is_visible, starts_at, ends_at, created_by) VALUES (:title, :message, :box_type, :display_location, :is_visible, :starts_at, :ends_at, :created_by)');
                $stmt->execute([
                    ':title' => $title,
                    ':message' => $message,
                    ':box_type' => in_array($input['box_type'] ?? '', ['info', 'warning', 'success', 'danger'], true) ? $input['box_type'] : 'info',
                    ':display_location' => in_array($input['display_location'] ?? '', ['dashboard', 'all_pages', 'login_page', 'register_page'], true) ? $input['display_location'] : 'dashboard',
                    ':is_visible' => filter_var($input['is_visible'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
                    ':starts_at' => !empty($input['starts_at']) ? neximatrix_string($input['starts_at'], 1, 19) : null,
                    ':ends_at' => !empty($input['ends_at']) ? neximatrix_string($input['ends_at'], 1, 19) : null,
                    ':created_by' => $admin['id'],
                ]);
                neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.info_box.created', 'info_box', (int) $pdo->lastInsertId());
                neximatrix_success(['id' => (int) $pdo->lastInsertId()], 201);
            }
            neximatrix_http_error('Method not allowed.', 405);
            // no break

        // ─── Bonus Records ─────────────────────────────────────────────────

        case 'admin/bonus-records':
            neximatrix_method('GET', 'POST');
            $admin = neximatrix_require_admin();
            $pdo = neximatrix_db();
            if ($method === 'GET') {
                neximatrix_require_permission($pdo, $admin, 'users.view');
                [$page, $limit, $offset] = neximatrix_page_params();
                $countStmt = $pdo->prepare('SELECT COUNT(*) FROM bonus_records');
                $countStmt->execute();
                $total = (int) $countStmt->fetchColumn();
                $stmt = $pdo->prepare('SELECT br.*, u.username, u.full_name FROM bonus_records br INNER JOIN users u ON u.id = br.user_id ORDER BY br.created_at DESC LIMIT :limit OFFSET :offset');
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
                $stmt->execute();
                neximatrix_success(['records' => ['items' => $stmt->fetchAll(), 'total' => $total, 'page' => $page]]);
            }
            neximatrix_require_csrf();
            neximatrix_require_permission($pdo, $admin, 'users.edit');
            $input = neximatrix_input();
            $userId = (int) ($input['user_id'] ?? 0);
            $amount = (float) ($input['amount'] ?? 0);
            $reason = neximatrix_string($input['reason'] ?? '', 3, 500);
            if ($userId < 1 || $amount <= 0 || $reason === '') {
                neximatrix_http_error('User ID, amount, and reason are required.', 422);
            }
            $user = neximatrix_user_by_id($pdo, $userId);
            if ($user === null) {
                neximatrix_http_error('User not found.', 404);
            }
            $pdo->prepare('INSERT INTO bonus_records (user_id, bonus_id, amount, reason, awarded_by) VALUES (:user_id, :bonus_id, :amount, :reason, :awarded_by)')
                ->execute([':user_id' => $userId, ':bonus_id' => isset($input['bonus_id']) ? (int) $input['bonus_id'] : null, ':amount' => $amount, ':reason' => $reason, ':awarded_by' => $admin['id']]);
            neximatrix_credit_wallet($pdo, $userId, $amount, 'adjustment', null, null, $reason);
            neximatrix_log_activity($pdo, $admin['id'], 'admin', 'admin.bonus.awarded', 'user', $userId, ['amount' => $amount]);
            if ($user !== null) {
                NeximatrixMailService::sendBonusNotification((string) $user['email'], (string) $user['fullName'], $amount, $reason);
            }
            neximatrix_success(['awarded' => true], 201);
            // no break

        // ─── Expiring Deposits ─────────────────────────────────────────────

        case 'admin/expiring-deposits':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'support.view');
            $days = min(90, max(1, neximatrix_query_int('days', 7)));
            $stmt = neximatrix_db()->prepare(
                'SELECT i.*, u.username, u.full_name, p.name AS plan_name
                 FROM investments i
                 INNER JOIN users u ON u.id = i.user_id
                 INNER JOIN investment_plans p ON p.id = i.plan_id
                 WHERE i.status = "active" AND i.ends_at < DATE_ADD(UTC_TIMESTAMP(), INTERVAL :days DAY)
                 ORDER BY i.ends_at ASC'
            );
            $stmt->bindValue(':days', $days, PDO::PARAM_INT);
            $stmt->execute();
            neximatrix_success(['investments' => $stmt->fetchAll()]);
            // no break

        // ─── Earnings Ledger ───────────────────────────────────────────────

        case 'admin/earnings':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'support.view');
            [$page, $limit, $offset] = neximatrix_page_params();
            $type = neximatrix_query_string('type');
            $pdo = neximatrix_db();
            $where = "type = 'profit'";
            $params = [];
            if ($type !== '') {
                $where .= ' AND type = :type';
                $params[':type'] = $type;
            }
            $countStmt = $pdo->prepare("SELECT COUNT(*) FROM transactions WHERE {$where}");
            $countStmt->execute($params);
            $total = (int) $countStmt->fetchColumn();
            $stmt = $pdo->prepare("SELECT t.*, u.username, u.full_name FROM transactions t INNER JOIN users u ON u.id = t.user_id WHERE {$where} ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset");
            foreach ($params as $k => $v) $stmt->bindValue($k, $v);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            neximatrix_success(['earnings' => ['items' => $stmt->fetchAll(), 'total' => $total, 'page' => $page]]);
            // no break

        // ─── Pending Deposits ──────────────────────────────────────────────

        case 'admin/pending-deposits':
            neximatrix_method('GET');
            neximatrix_require_admin();
            neximatrix_require_permission(neximatrix_db(), neximatrix_require_admin(), 'support.view');
            [$page, $limit, $offset] = neximatrix_page_params();
            $result = neximatrix_list_all_deposits(neximatrix_db(), 'pending', $limit, $offset);
            $result['page'] = $page;
            neximatrix_success(['deposits' => $result]);
            // no break

        default:
            neximatrix_http_error('Endpoint not found.', 404);
    }
} catch (NeximatrixHttpException $exception) {
    neximatrix_error($exception->getMessage(), $exception->status, $exception->errors);
} catch (PDOException $exception) {
    error_log('Neximatrix database error: ' . $exception->getMessage());
    neximatrix_error('The database service is temporarily unavailable.', 503);
} catch (Throwable $exception) {
    error_log('Neximatrix application error: ' . $exception->getMessage());
    neximatrix_error('An unexpected server error occurred.', 500);
}
