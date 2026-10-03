<?php
declare(strict_types=1);

function neximatrix_user_roles(PDO $pdo, int $userId): array
{
    $statement = $pdo->prepare(
        'SELECT r.name
         FROM roles r
         INNER JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = :user_id
         ORDER BY r.name'
    );
    $statement->execute([':user_id' => $userId]);
    return $statement->fetchAll(PDO::FETCH_COLUMN);
}

function neximatrix_user_dto(array $user, array $roles): array
{
    return [
        'id' => (int) $user['id'],
        'fullName' => (string) $user['full_name'],
        'username' => (string) $user['username'],
        'email' => (string) $user['email'],
        'phone' => $user['phone'] !== null ? (string) $user['phone'] : '',
        'status' => (string) $user['status'],
        'roles' => array_values($roles),
        'emailVerified' => !empty($user['email_verified_at']),
        'lastLoginAt' => neximatrix_date($user['last_login_at'] ?? null),
        'createdAt' => neximatrix_date($user['created_at'] ?? null),
    ];
}

function neximatrix_find_user_by_identifier(PDO $pdo, string $identifier): ?array
{
    $statement = $pdo->prepare(
        'SELECT id, full_name, username, email, phone, password_hash, status,
                email_verified_at, last_login_at, created_at, updated_at
         FROM users
         WHERE email = :email OR username = :username
         LIMIT 1'
    );
    $statement->execute([
        ':email' => strtolower($identifier),
        ':username' => $identifier,
    ]);
    $user = $statement->fetch();
    return $user === false ? null : $user;
}

function neximatrix_user_by_id(PDO $pdo, int $userId): ?array
{
    $statement = $pdo->prepare(
        'SELECT id, full_name, username, email, phone, password_hash, status,
                email_verified_at, last_login_at, created_at, updated_at
         FROM users
         WHERE id = :id
         LIMIT 1'
    );
    $statement->execute([':id' => $userId]);
    $user = $statement->fetch();
    return $user === false ? null : $user;
}

function neximatrix_current_user(): ?array
{
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    $sessionId = session_id();
    if ($userId < 1 || $sessionId === false || $sessionId === '') {
        return null;
    }

    $pdo = neximatrix_db();
    $statement = $pdo->prepare(
        'SELECT u.id, u.full_name, u.username, u.email, u.phone, u.status,
                u.email_verified_at, u.last_login_at, u.created_at, u.updated_at
         FROM users u
         INNER JOIN sessions s ON s.user_id = u.id
         WHERE u.id = :user_id
           AND s.session_hash = :session_hash
           AND s.revoked_at IS NULL
           AND s.expires_at > UTC_TIMESTAMP()
           AND u.status = \'active\'
         LIMIT 1'
    );
    $statement->execute([
        ':user_id' => $userId,
        ':session_hash' => hash('sha256', $sessionId),
    ]);
    $user = $statement->fetch();
    if ($user === false) {
        neximatrix_destroy_session();
        return null;
    }

    $pdo->prepare('UPDATE sessions SET last_activity_at = UTC_TIMESTAMP() WHERE session_hash = :hash')
        ->execute([':hash' => hash('sha256', $sessionId)]);

    return neximatrix_user_dto($user, neximatrix_user_roles($pdo, $userId));
}

function neximatrix_require_user(): array
{
    $user = neximatrix_current_user();
    if ($user === null) {
        neximatrix_http_error('Authentication required.', 401);
    }
    return $user;
}

function neximatrix_require_admin(): array
{
    $user = neximatrix_require_user();
    if (!array_intersect($user['roles'], ['admin', 'super_admin'])) {
        neximatrix_http_error('Administrator access is required.', 403);
    }
    return $user;
}

function neximatrix_start_session(PDO $pdo, array $user): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        neximatrix_http_error('Session could not be started.', 500);
    }

    $previousUserId = (int) ($_SESSION['user_id'] ?? 0);
    $previousSessionId = session_id();
    if ($previousUserId > 0 && is_string($previousSessionId) && $previousSessionId !== '') {
        $pdo->prepare(
            'UPDATE sessions SET revoked_at = UTC_TIMESTAMP()
             WHERE user_id = :user_id AND session_hash = :session_hash AND revoked_at IS NULL'
        )->execute([
            ':user_id' => $previousUserId,
            ':session_hash' => hash('sha256', $previousSessionId),
        ]);
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $sessionHash = hash('sha256', session_id());
    $expiresAt = gmdate('Y-m-d H:i:s', time() + neximatrix_config()['session_lifetime']);

    $statement = $pdo->prepare(
        'INSERT INTO sessions
            (user_id, session_hash, ip_address, user_agent, last_activity_at, expires_at)
         VALUES
            (:user_id, :session_hash, :ip_address, :user_agent, UTC_TIMESTAMP(), :expires_at)'
    );
    $statement->execute([
        ':user_id' => $user['id'],
        ':session_hash' => $sessionHash,
        ':ip_address' => neximatrix_client_ip(),
        ':user_agent' => neximatrix_user_agent(),
        ':expires_at' => $expiresAt,
    ]);

    $pdo->prepare('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = :id')
        ->execute([':id' => $user['id']]);
}

function neximatrix_revoke_current_session(PDO $pdo, int $userId): void
{
    $sessionId = session_id();
    if ($sessionId === false || $sessionId === '') {
        return;
    }
    $pdo->prepare(
        'UPDATE sessions
         SET revoked_at = UTC_TIMESTAMP()
         WHERE user_id = :user_id AND session_hash = :session_hash AND revoked_at IS NULL'
    )->execute([
        ':user_id' => $userId,
        ':session_hash' => hash('sha256', $sessionId),
    ]);
}

function neximatrix_destroy_session(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }
}
