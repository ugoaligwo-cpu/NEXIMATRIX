<?php
declare(strict_types=1);

function neximatrix_list_users(PDO $pdo, string $search = '', string $status = '', int $limit = 20, int $offset = 0): array
{
    $where = ['1 = 1'];
    $params = [];

    if ($search !== '') {
        $where[] = '(u.full_name LIKE :search_name OR u.username LIKE :search_username OR u.email LIKE :search_email)';
        $params[':search_name'] = '%' . $search . '%';
        $params[':search_username'] = '%' . $search . '%';
        $params[':search_email'] = '%' . $search . '%';
    }
    if (in_array($status, ['pending', 'active', 'suspended', 'disabled', 'closed'], true)) {
        $where[] = 'u.status = :status';
        $params[':status'] = $status;
    }

    $whereSql = implode(' AND ', $where);
    $countStatement = $pdo->prepare("SELECT COUNT(*) FROM users u WHERE {$whereSql}");
    $countStatement->execute($params);
    $total = (int) $countStatement->fetchColumn();

    $statement = $pdo->prepare(
        "SELECT u.id, u.full_name, u.username, u.email, u.phone, u.status,
                u.email_verified_at, u.last_login_at, u.created_at, u.updated_at,
                GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ',') AS role_names
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         WHERE {$whereSql}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $key => $value) {
        $statement->bindValue($key, $value);
    }
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();

    $users = [];
    foreach ($statement->fetchAll() as $row) {
        $row['id'] = (int) $row['id'];
        $row['roles'] = $row['role_names'] ? explode(',', $row['role_names']) : [];
        $row['emailVerified'] = !empty($row['email_verified_at']);
        unset($row['role_names']);
        $users[] = $row;
    }

    return ['items' => $users, 'total' => $total, 'page' => (int) ($offset / max(1, $limit)) + 1, 'limit' => $limit];
}

function neximatrix_admin_user_detail(PDO $pdo, int $userId): ?array
{
    $user = neximatrix_user_by_id($pdo, $userId);
    if ($user === null) {
        return null;
    }

    $roles = neximatrix_user_roles($pdo, $userId);
    $supportStatement = $pdo->prepare(
        "SELECT COUNT(*) FROM support_tickets WHERE user_id = :user_id AND status IN ('open', 'in_progress', 'waiting_for_user')"
    );
    $supportStatement->execute([':user_id' => $userId]);
    $notificationStatement = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL');
    $notificationStatement->execute([':user_id' => $userId]);
    $activityStatement = $pdo->prepare(
        'SELECT action, entity_type, entity_id, created_at
         FROM activity_logs WHERE actor_user_id = :user_id
         ORDER BY created_at DESC LIMIT 10'
    );
    $activityStatement->execute([':user_id' => $userId]);

    return [
        'user' => neximatrix_user_dto($user, $roles),
        'openSupportTickets' => (int) $supportStatement->fetchColumn(),
        'unreadNotifications' => (int) $notificationStatement->fetchColumn(),
        'recentActivity' => $activityStatement->fetchAll(),
    ];
}

function neximatrix_update_profile(PDO $pdo, int $userId, array $input): array
{
    $name = neximatrix_string($input['full_name'] ?? '', 2, 120);
    $phone = neximatrix_string($input['phone'] ?? '', 0, 30);
    if ($name === '') {
        neximatrix_http_error('A valid full name is required.', 422, ['full_name' => 'Enter your full name.']);
    }

    $statement = $pdo->prepare(
        'UPDATE users SET full_name = :full_name, phone = :phone, updated_at = UTC_TIMESTAMP() WHERE id = :id'
    );
    $statement->execute([
        ':full_name' => $name,
        ':phone' => $phone !== '' ? $phone : null,
        ':id' => $userId,
    ]);

    $user = neximatrix_user_by_id($pdo, $userId);
    return neximatrix_user_dto($user, neximatrix_user_roles($pdo, $userId));
}

function neximatrix_admin_update_user(PDO $pdo, int $userId, array $input): array
{
    $user = neximatrix_user_by_id($pdo, $userId);
    if ($user === null) {
        neximatrix_http_error('User not found.', 404);
    }

    $fields = [];
    $params = [':id' => $userId];
    if (array_key_exists('full_name', $input)) {
        $name = neximatrix_string($input['full_name'], 2, 120);
        if ($name === '') {
            neximatrix_http_error('A valid full name is required.', 422);
        }
        $fields[] = 'full_name = :full_name';
        $params[':full_name'] = $name;
    }
    if (array_key_exists('phone', $input)) {
        $phone = neximatrix_string($input['phone'], 0, 30);
        $fields[] = 'phone = :phone';
        $params[':phone'] = $phone !== '' ? $phone : null;
    }
    if ($fields === []) {
        neximatrix_http_error('No permitted fields were supplied.', 422);
    }

    $statement = $pdo->prepare(
        'UPDATE users SET ' . implode(', ', $fields) . ', updated_at = UTC_TIMESTAMP() WHERE id = :id'
    );
    $statement->execute($params);
    return neximatrix_user_dto(neximatrix_user_by_id($pdo, $userId), neximatrix_user_roles($pdo, $userId));
}

function neximatrix_set_user_status(PDO $pdo, int $userId, string $status): void
{
    if (!in_array($status, ['pending', 'active', 'suspended', 'disabled', 'closed'], true)) {
        neximatrix_http_error('Invalid account status.', 422);
    }
    $check = $pdo->prepare('SELECT id FROM users WHERE id = :id LIMIT 1');
    $check->execute([':id' => $userId]);
    if ($check->fetchColumn() === false) {
        neximatrix_http_error('User not found.', 404);
    }

    $pdo->prepare('UPDATE users SET status = :status, updated_at = UTC_TIMESTAMP() WHERE id = :id')
        ->execute([':status' => $status, ':id' => $userId]);

    if ($status !== 'active') {
        $pdo->prepare('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = :user_id AND revoked_at IS NULL')
            ->execute([':user_id' => $userId]);
    }
}

function neximatrix_dashboard_summary(PDO $pdo, int $userId): array
{
    $openTickets = $pdo->prepare(
        "SELECT COUNT(*) FROM support_tickets WHERE user_id = :user_id AND status IN ('open', 'in_progress', 'waiting_for_user')"
    );
    $openTickets->execute([':user_id' => $userId]);
    $unread = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = :user_id AND read_at IS NULL');
    $unread->execute([':user_id' => $userId]);
    $activity = $pdo->prepare(
        'SELECT action, entity_type, entity_id, created_at
         FROM activity_logs WHERE actor_user_id = :user_id
         ORDER BY created_at DESC LIMIT 8'
    );
    $activity->execute([':user_id' => $userId]);
    $profileCompletion = 0;
    $user = neximatrix_user_by_id($pdo, $userId);
    if ($user !== null) {
        $profileCompletion = (int) (($user['full_name'] !== '' ? 1 : 0) + ($user['phone'] !== null && $user['phone'] !== '' ? 1 : 0) + ($user['email_verified_at'] !== null ? 1 : 0)) / 3 * 100;
    }

    return [
        'openSupportTickets' => (int) $openTickets->fetchColumn(),
        'unreadNotifications' => (int) $unread->fetchColumn(),
        'profileCompletion' => $profileCompletion,
        'recentActivity' => $activity->fetchAll(),
    ];
}

function neximatrix_admin_dashboard(PDO $pdo): array
{
    $counts = [];
    foreach ([
        'users' => 'SELECT COUNT(*) FROM users',
        'activeUsers' => "SELECT COUNT(*) FROM users WHERE status = 'active'",
        'suspendedUsers' => "SELECT COUNT(*) FROM users WHERE status IN ('suspended', 'disabled')",
        'openTickets' => "SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress', 'waiting_for_user')",
    ] as $key => $sql) {
        $counts[$key] = (int) $pdo->query($sql)->fetchColumn();
    }
    $activity = $pdo->query(
        'SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at,
                u.username, u.full_name
         FROM activity_logs a
         LEFT JOIN users u ON u.id = a.actor_user_id
         ORDER BY a.created_at DESC LIMIT 12'
    )->fetchAll();
    $tickets = neximatrix_list_support_tickets($pdo, '', 'open', 8, 0);
    return ['counts' => $counts, 'recentActivity' => $activity, 'openTickets' => $tickets['items']];
}

function neximatrix_list_notifications(PDO $pdo, int $userId, int $limit = 30): array
{
    $statement = $pdo->prepare(
        'SELECT id, title, message, type, read_at, created_at
         FROM notifications WHERE user_id = :user_id
         ORDER BY created_at DESC LIMIT :limit'
    );
    $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->execute();
    return $statement->fetchAll();
}

function neximatrix_create_notification(PDO $pdo, ?int $userId, string $title, string $message, string $type = 'general'): int
{
    $statement = $pdo->prepare(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (:user_id, :title, :message, :type)'
    );
    $statement->execute([
        ':user_id' => $userId,
        ':title' => $title,
        ':message' => $message,
        ':type' => $type,
    ]);
    return (int) $pdo->lastInsertId();
}

function neximatrix_mark_notification_read(PDO $pdo, int $userId, int $notificationId): void
{
    $statement = $pdo->prepare(
        'UPDATE notifications SET read_at = UTC_TIMESTAMP()
         WHERE id = :id AND user_id = :user_id AND read_at IS NULL'
    );
    $statement->execute([':id' => $notificationId, ':user_id' => $userId]);
}

function neximatrix_list_support_tickets(PDO $pdo, string $search = '', string $status = '', int $limit = 20, int $offset = 0, ?int $userId = null): array
{
    $where = ['1 = 1'];
    $params = [];
    if ($userId !== null) {
        $where[] = 't.user_id = :user_id';
        $params[':user_id'] = $userId;
    }
    if ($search !== '') {
        $where[] = '(t.subject LIKE :search_subject OR u.email LIKE :search_email OR u.username LIKE :search_username)';
        $params[':search_subject'] = '%' . $search . '%';
        $params[':search_email'] = '%' . $search . '%';
        $params[':search_username'] = '%' . $search . '%';
    }
    if (in_array($status, ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'], true)) {
        $where[] = 't.status = :status';
        $params[':status'] = $status;
    }
    $whereSql = implode(' AND ', $where);
    $count = $pdo->prepare("SELECT COUNT(*) FROM support_tickets t INNER JOIN users u ON u.id = t.user_id WHERE {$whereSql}");
    $count->execute($params);
    $statement = $pdo->prepare(
        "SELECT t.id, t.user_id, t.subject, t.status, t.priority, t.last_message_at,
                t.created_at, t.updated_at, u.username, u.full_name, u.email,
                (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = t.id AND sm.is_internal = 0) AS message_count
         FROM support_tickets t INNER JOIN users u ON u.id = t.user_id
         WHERE {$whereSql}
         ORDER BY t.updated_at DESC LIMIT :limit OFFSET :offset"
    );
    foreach ($params as $key => $value) {
        $statement->bindValue($key, $value);
    }
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();
    return ['items' => $statement->fetchAll(), 'total' => (int) $count->fetchColumn(), 'limit' => $limit, 'offset' => $offset];
}

function neximatrix_support_ticket(PDO $pdo, int $ticketId, ?int $userId = null, bool $admin = false): ?array
{
    $params = [':id' => $ticketId];
    $userSql = '';
    if (!$admin && $userId !== null) {
        $userSql = ' AND t.user_id = :user_id';
        $params[':user_id'] = $userId;
    }
    $statement = $pdo->prepare(
        "SELECT t.*, u.username, u.full_name, u.email
         FROM support_tickets t INNER JOIN users u ON u.id = t.user_id
         WHERE t.id = :id{$userSql} LIMIT 1"
    );
    $statement->execute($params);
    $ticket = $statement->fetch();
    if ($ticket === false) {
        return null;
    }
    $messageSql = 'SELECT id, ticket_id, author_user_id, author_type, body, is_internal, created_at FROM support_messages WHERE ticket_id = :id';
    if (!$admin) {
        $messageSql .= ' AND is_internal = 0';
    }
    $messageSql .= ' ORDER BY created_at ASC';
    $messages = $pdo->prepare($messageSql);
    $messages->execute([':id' => $ticketId]);
    $ticket['messages'] = $messages->fetchAll();
    return $ticket;
}

function neximatrix_create_support_ticket(PDO $pdo, int $userId, string $subject, string $body): int
{
    $ticket = $pdo->prepare(
        'INSERT INTO support_tickets (user_id, subject, status, priority, last_message_at) VALUES (:user_id, :subject, \'open\', \'normal\', UTC_TIMESTAMP())'
    );
    $ticket->execute([':user_id' => $userId, ':subject' => $subject]);
    $ticketId = (int) $pdo->lastInsertId();
    $message = $pdo->prepare(
        'INSERT INTO support_messages (ticket_id, author_user_id, author_type, body, is_internal) VALUES (:ticket_id, :author_id, \'user\', :body, 0)'
    );
    $message->execute([':ticket_id' => $ticketId, ':author_id' => $userId, ':body' => $body]);
    $pdo->prepare('UPDATE support_tickets SET updated_at = UTC_TIMESTAMP() WHERE id = :id')->execute([':id' => $ticketId]);
    return $ticketId;
}

function neximatrix_create_support_message(PDO $pdo, int $ticketId, ?int $authorId, string $authorType, string $body, bool $internal = false): int
{
    $statement = $pdo->prepare(
        'INSERT INTO support_messages (ticket_id, author_user_id, author_type, body, is_internal) VALUES (:ticket_id, :author_id, :author_type, :body, :internal)'
    );
    $statement->execute([
        ':ticket_id' => $ticketId,
        ':author_id' => $authorId,
        ':author_type' => $authorType,
        ':body' => $body,
        ':internal' => $internal ? 1 : 0,
    ]);
    $pdo->prepare('UPDATE support_tickets SET last_message_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = :id')->execute([':id' => $ticketId]);
    return (int) $pdo->lastInsertId();
}

function neximatrix_set_support_ticket_status(PDO $pdo, int $ticketId, string $status): void
{
    if (!in_array($status, ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'], true)) {
        neximatrix_http_error('Invalid support ticket status.', 422);
    }
    $check = $pdo->prepare('SELECT id FROM support_tickets WHERE id = :id LIMIT 1');
    $check->execute([':id' => $ticketId]);
    if ($check->fetchColumn() === false) {
        neximatrix_http_error('Support ticket not found.', 404);
    }
    $pdo->prepare(
        'UPDATE support_tickets SET status = :status, updated_at = UTC_TIMESTAMP() WHERE id = :id'
    )->execute([':status' => $status, ':id' => $ticketId]);
}

function neximatrix_activity(PDO $pdo, int $userId, int $limit = 50): array
{
    $statement = $pdo->prepare(
        'SELECT id, action, entity_type, entity_id, metadata, created_at
         FROM activity_logs WHERE actor_user_id = :user_id
         ORDER BY created_at DESC LIMIT :limit'
    );
    $statement->bindValue(':user_id', $userId, PDO::PARAM_INT);
    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->execute();
    return $statement->fetchAll();
}

function neximatrix_site_settings(PDO $pdo): array
{
    return $pdo->query('SELECT setting_key, setting_value, value_type, is_public, updated_at FROM site_settings ORDER BY setting_key')->fetchAll();
}

function neximatrix_update_site_settings(PDO $pdo, array $settings, int $adminId): array
{
    $allowed = ['support_email', 'support_phone', 'announcement', 'about_text'];
    $filtered = array_intersect_key($settings, array_flip($allowed));
    if ($filtered === []) {
        neximatrix_http_error('No permitted website settings were supplied.', 422);
    }
    $statement = $pdo->prepare(
        'INSERT INTO site_settings (setting_key, setting_value, value_type, is_public, updated_by)
         VALUES (:setting_key, :setting_value, \'text\', 1, :updated_by)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = UTC_TIMESTAMP()'
    );
    foreach ($filtered as $key => $value) {
        $statement->execute([
            ':setting_key' => $key,
            ':setting_value' => neximatrix_string($value, 0, 5000),
            ':updated_by' => $adminId,
        ]);
    }
    return neximatrix_site_settings($pdo);
}
