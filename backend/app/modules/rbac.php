<?php
declare(strict_types=1);

function neximatrix_admin_roles(PDO $pdo): array
{
    return $pdo->query('SELECT id, name, description FROM admin_roles ORDER BY name')->fetchAll();
}

function neximatrix_admin_permissions(PDO $pdo): array
{
    return $pdo->query('SELECT id, name, description FROM admin_permissions ORDER BY name')->fetchAll();
}

function neximatrix_admin_user_roles(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT r.id, r.name, r.description
         FROM admin_roles r
         INNER JOIN admin_user_roles aur ON aur.role_id = r.id
         WHERE aur.user_id = :user_id
         ORDER BY r.name'
    );
    $stmt->execute([':user_id' => $userId]);
    return $stmt->fetchAll();
}

function neximatrix_admin_user_permissions(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT DISTINCT p.id, p.name
         FROM admin_permissions p
         INNER JOIN admin_role_permissions arp ON arp.permission_id = p.id
         INNER JOIN admin_user_roles aur ON aur.role_id = arp.role_id
         WHERE aur.user_id = :user_id
         ORDER BY p.name'
    );
    $stmt->execute([':user_id' => $userId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function neximatrix_user_has_permission(PDO $pdo, int $userId, string $permission): bool
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*)
         FROM admin_permissions p
         INNER JOIN admin_role_permissions arp ON arp.permission_id = p.id
         INNER JOIN admin_user_roles aur ON aur.role_id = arp.role_id
         WHERE aur.user_id = :user_id AND p.name = :permission'
    );
    $stmt->execute([':user_id' => $userId, ':permission' => $permission]);
    return (int) $stmt->fetchColumn() > 0;
}

function neximatrix_require_permission(PDO $pdo, array $admin, string $permission): void
{
    if (!neximatrix_user_has_permission($pdo, $admin['id'], $permission)) {
        neximatrix_http_error('You do not have permission to perform this action.', 403);
    }
}

function neximatrix_assign_admin_role(PDO $pdo, int $userId, int $roleId, int $adminId): void
{
    $stmt = $pdo->prepare('INSERT IGNORE INTO admin_user_roles (user_id, role_id) VALUES (?, ?)');
    $stmt->execute([$userId, $roleId]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.role.assigned', 'user', $userId, ['role_id' => $roleId]);
}

function neximatrix_remove_admin_role(PDO $pdo, int $userId, int $roleId, int $adminId): void
{
    $stmt = $pdo->prepare('DELETE FROM admin_user_roles WHERE user_id = ? AND role_id = ?');
    $stmt->execute([$userId, $roleId]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.role.removed', 'user', $userId, ['role_id' => $roleId]);
}

function neximatrix_log_security_event(PDO $pdo, ?int $userId, string $eventType, array $details = []): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO security_events (user_id, event_type, ip_address, user_agent, details)
         VALUES (:user_id, :event_type, :ip_address, :user_agent, :details)'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':event_type' => $eventType,
        ':ip_address' => neximatrix_client_ip(),
        ':user_agent' => neximatrix_user_agent(),
        ':details' => $details === [] ? null : json_encode($details, JSON_UNESCAPED_UNICODE),
    ]);
}

function neximatrix_log_login_attempt(PDO $pdo, ?int $userId, string $identifier, bool $success): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO login_attempts (user_id, identifier, ip_address, user_agent, success)
         VALUES (:user_id, :identifier, :ip_address, :user_agent, :success)'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':identifier' => substr($identifier, 0, 190),
        ':ip_address' => neximatrix_client_ip(),
        ':user_agent' => neximatrix_user_agent(),
        ':success' => $success ? 1 : 0,
    ]);
}

function neximatrix_recent_login_attempts(PDO $pdo, string $identifier, int $limit = 10): array
{
    $stmt = $pdo->prepare(
        'SELECT id, identifier, ip_address, success, created_at
         FROM login_attempts
         WHERE identifier = :identifier
         ORDER BY created_at DESC
         LIMIT :limit'
    );
    $stmt->bindValue(':identifier', $identifier);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_failed_login_count(PDO $pdo, string $identifier, int $minutes = 30): int
{
    $stmt = $pdo->prepare(
        'SELECT COUNT(*) FROM login_attempts
         WHERE identifier = :identifier AND success = 0
           AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL :minutes MINUTE)'
    );
    $stmt->bindValue(':identifier', $identifier);
    $stmt->bindValue(':minutes', $minutes, PDO::PARAM_INT);
    $stmt->execute();
    return (int) $stmt->fetchColumn();
}
