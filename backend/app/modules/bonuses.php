<?php
declare(strict_types=1);

function neximatrix_admin_bonuses_list(PDO $pdo, string $status = ''): array
{
    $where = '1 = 1';
    $params = [];
    if (in_array($status, ['active', 'inactive', 'expired'], true)) {
        $where .= ' AND status = :status';
        $params[':status'] = $status;
    }
    $stmt = $pdo->prepare("SELECT * FROM demo_bonuses WHERE {$where} ORDER BY created_at DESC");
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_admin_bonus_get(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM demo_bonuses WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $bonus = $stmt->fetch();
    return $bonus === false ? null : $bonus;
}

function neximatrix_admin_bonus_create(PDO $pdo, array $input, int $adminId): array
{
    $title = neximatrix_string($input['title'] ?? '', 2, 120);
    if ($title === '') {
        neximatrix_http_error('Title is required.', 422);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO demo_bonuses (title, description, badge_label, demo_points, is_active, starts_at, ends_at, eligibility_description, user_terms, created_by)
         VALUES (:title, :description, :badge_label, :demo_points, :is_active, :starts_at, :ends_at, :eligibility_description, :user_terms, :created_by)'
    );
    $stmt->execute([
        ':title' => $title,
        ':description' => neximatrix_string($input['description'] ?? '', 0, 5000),
        ':badge_label' => neximatrix_string($input['badge_label'] ?? '', 0, 60),
        ':demo_points' => max(0, (int) ($input['demo_points'] ?? 0)),
        ':is_active' => filter_var($input['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
        ':starts_at' => !empty($input['starts_at']) ? neximatrix_string($input['starts_at'], 1, 19) : null,
        ':ends_at' => !empty($input['ends_at']) ? neximatrix_string($input['ends_at'], 1, 19) : null,
        ':eligibility_description' => neximatrix_string($input['eligibility_description'] ?? '', 0, 5000),
        ':user_terms' => neximatrix_string($input['user_terms'] ?? '', 0, 5000),
        ':created_by' => $adminId,
    ]);
    $id = (int) $pdo->lastInsertId();
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.bonus.created', 'demo_bonus', $id);
    return neximatrix_admin_bonus_get($pdo, $id);
}

function neximatrix_admin_bonus_update(PDO $pdo, int $id, array $input, int $adminId): array
{
    $bonus = neximatrix_admin_bonus_get($pdo, $id);
    if ($bonus === null) {
        neximatrix_http_error('Bonus not found.', 404);
    }

    $fields = [];
    $params = [':id' => $id];

    if (array_key_exists('title', $input)) {
        $title = neximatrix_string($input['title'], 2, 120);
        if ($title === '') neximatrix_http_error('Title is required.', 422);
        $fields[] = 'title = :title';
        $params[':title'] = $title;
    }
    if (array_key_exists('description', $input)) {
        $fields[] = 'description = :description';
        $params[':description'] = neximatrix_string($input['description'], 0, 5000);
    }
    if (array_key_exists('badge_label', $input)) {
        $fields[] = 'badge_label = :badge_label';
        $params[':badge_label'] = neximatrix_string($input['badge_label'], 0, 60);
    }
    if (array_key_exists('demo_points', $input)) {
        $fields[] = 'demo_points = :demo_points';
        $params[':demo_points'] = max(0, (int) $input['demo_points']);
    }
    if (array_key_exists('is_active', $input)) {
        $fields[] = 'is_active = :is_active';
        $params[':is_active'] = filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }
    if (array_key_exists('starts_at', $input)) {
        $fields[] = 'starts_at = :starts_at';
        $params[':starts_at'] = !empty($input['starts_at']) ? neximatrix_string($input['starts_at'], 1, 19) : null;
    }
    if (array_key_exists('ends_at', $input)) {
        $fields[] = 'ends_at = :ends_at';
        $params[':ends_at'] = !empty($input['ends_at']) ? neximatrix_string($input['ends_at'], 1, 19) : null;
    }
    if (array_key_exists('eligibility_description', $input)) {
        $fields[] = 'eligibility_description = :eligibility_description';
        $params[':eligibility_description'] = neximatrix_string($input['eligibility_description'], 0, 5000);
    }
    if (array_key_exists('user_terms', $input)) {
        $fields[] = 'user_terms = :user_terms';
        $params[':user_terms'] = neximatrix_string($input['user_terms'], 0, 5000);
    }

    if ($fields === []) {
        neximatrix_http_error('No fields to update.', 422);
    }

    $pdo->prepare('UPDATE demo_bonuses SET ' . implode(', ', $fields) . ', updated_at = UTC_TIMESTAMP() WHERE id = :id')->execute($params);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.bonus.updated', 'demo_bonus', $id, ['fields' => array_keys($input)]);
    return neximatrix_admin_bonus_get($pdo, $id);
}

function neximatrix_admin_bonus_toggle(PDO $pdo, int $id, int $adminId): array
{
    $bonus = neximatrix_admin_bonus_get($pdo, $id);
    if ($bonus === null) {
        neximatrix_http_error('Bonus not found.', 404);
    }
    $newStatus = $bonus['is_active'] ? 0 : 1;
    $pdo->prepare('UPDATE demo_bonuses SET is_active = :status, updated_at = UTC_TIMESTAMP() WHERE id = :id')
        ->execute([':status' => $newStatus, ':id' => $id]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.bonus.toggled', 'demo_bonus', $id, ['is_active' => $newStatus]);
    return neximatrix_admin_bonus_get($pdo, $id);
}

function neximatrix_admin_bonus_delete(PDO $pdo, int $id, int $adminId): void
{
    $bonus = neximatrix_admin_bonus_get($pdo, $id);
    if ($bonus === null) {
        neximatrix_http_error('Bonus not found.', 404);
    }
    $pdo->prepare('DELETE FROM demo_bonuses WHERE id = :id')->execute([':id' => $id]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.bonus.deleted', 'demo_bonus', $id);
}
