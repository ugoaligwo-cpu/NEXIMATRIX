<?php
declare(strict_types=1);

function neximatrix_admin_user_list(PDO $pdo, string $search = '', string $status = '', int $limit = 20, int $offset = 0): array
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
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users u WHERE {$whereSql}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "SELECT u.id, u.full_name, u.username, u.email, u.phone, u.status,
                   u.email_verified_at, u.last_login_at, u.created_at, u.updated_at,
                   GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ',') AS role_names
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE {$whereSql}
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $users = [];
    foreach ($stmt->fetchAll() as $row) {
        $row['id'] = (int) $row['id'];
        $row['roles'] = $row['role_names'] ? explode(',', $row['role_names']) : [];
        unset($row['role_names']);
        $users[] = $row;
    }

    return ['items' => $users, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
}

function neximatrix_admin_user_update(PDO $pdo, int $userId, array $input, int $adminId): array
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

    $pdo->prepare('UPDATE users SET ' . implode(', ', $fields) . ', updated_at = UTC_TIMESTAMP() WHERE id = :id')
        ->execute($params);

    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.user.updated', 'user', $userId, ['fields' => array_keys($input)]);
    return neximatrix_user_dto(neximatrix_user_by_id($pdo, $userId), neximatrix_user_roles($pdo, $userId));
}

function neximatrix_admin_user_status(PDO $pdo, int $userId, string $status, int $adminId): void
{
    if (!in_array($status, ['pending', 'active', 'suspended', 'disabled', 'closed'], true)) {
        neximatrix_http_error('Invalid account status.', 422);
    }
    $user = neximatrix_user_by_id($pdo, $userId);
    if ($user === null) {
        neximatrix_http_error('User not found.', 404);
    }
    if ($userId === $adminId) {
        neximatrix_http_error('You cannot change your own account status.', 422);
    }

    $pdo->prepare('UPDATE users SET status = :status, updated_at = UTC_TIMESTAMP() WHERE id = :id')
        ->execute([':status' => $status, ':id' => $userId]);

    if ($status !== 'active') {
        $pdo->prepare('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = :user_id AND revoked_at IS NULL')
            ->execute([':user_id' => $userId]);
    }

    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.user.status_changed', 'user', $userId, ['status' => $status]);
    neximatrix_log_security_event($pdo, $userId, 'account.status_changed', ['new_status' => $status, 'admin_id' => $adminId]);
}

function neximatrix_admin_user_notes_list(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT un.id, un.note, un.created_at, u.full_name AS admin_name
         FROM user_notes un
         INNER JOIN users u ON u.id = un.admin_id
         WHERE un.user_id = :user_id
         ORDER BY un.created_at DESC'
    );
    $stmt->execute([':user_id' => $userId]);
    return $stmt->fetchAll();
}

function neximatrix_admin_user_notes_add(PDO $pdo, int $userId, int $adminId, string $note): array
{
    $stmt = $pdo->prepare('INSERT INTO user_notes (user_id, admin_id, note) VALUES (:user_id, :admin_id, :note)');
    $stmt->execute([':user_id' => $userId, ':admin_id' => $adminId, ':note' => $note]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.user.note_added', 'user', $userId);
    return ['id' => (int) $pdo->lastInsertId(), 'note' => $note, 'created_at' => gmdate('Y-m-d H:i:s')];
}

function neximatrix_admin_login_history(PDO $pdo, ?int $userId = null, int $limit = 20): array
{
    $where = '1 = 1';
    $params = [];
    if ($userId !== null) {
        $where = 'user_id = :user_id';
        $params[':user_id'] = $userId;
    }
    $stmt = $pdo->prepare(
        "SELECT id, user_id, identifier, ip_address, user_agent, success, created_at
         FROM login_attempts WHERE {$where}
         ORDER BY created_at DESC LIMIT :limit"
    );
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_admin_security_events_list(PDO $pdo, int $limit = 50): array
{
    $stmt = $pdo->prepare(
        'SELECT se.id, se.user_id, se.event_type, se.ip_address, se.created_at, u.username
         FROM security_events se
         LEFT JOIN users u ON u.id = se.user_id
         ORDER BY se.created_at DESC
         LIMIT :limit'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_admin_audit_log(PDO $pdo, int $limit = 50, int $offset = 0): array
{
    $count = $pdo->query('SELECT COUNT(*) FROM activity_logs')->fetchColumn();
    $stmt = $pdo->prepare(
        'SELECT a.id, a.actor_user_id, a.actor_role, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
                u.username, u.full_name
         FROM activity_logs a
         LEFT JOIN users u ON u.id = a.actor_user_id
         ORDER BY a.created_at DESC
         LIMIT :limit OFFSET :offset'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    return ['items' => $stmt->fetchAll(), 'total' => (int) $count, 'limit' => $limit, 'offset' => $offset];
}
