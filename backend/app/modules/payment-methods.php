<?php
declare(strict_types=1);

function neximatrix_admin_payment_methods_list(PDO $pdo, string $status = ''): array
{
    $where = '1 = 1';
    $params = [];
    if (in_array($status, ['active', 'archived'], true)) {
        $where .= ' AND status = :status';
        $params[':status'] = $status;
    }
    $stmt = $pdo->prepare("SELECT * FROM payment_method_display_configs WHERE {$where} ORDER BY display_order, display_name");
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_admin_payment_method_get(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM payment_method_display_configs WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $method = $stmt->fetch();
    return $method === false ? null : $method;
}

function neximatrix_admin_payment_method_create(PDO $pdo, array $input, int $adminId): array
{
    $key = neximatrix_string($input['method_key'] ?? '', 3, 80);
    $name = neximatrix_string($input['display_name'] ?? '', 2, 120);
    if ($key === '' || $name === '') {
        neximatrix_http_error('Method key and display name are required.', 422);
    }

    $exists = $pdo->prepare('SELECT id FROM payment_method_display_configs WHERE method_key = :key LIMIT 1');
    $exists->execute([':key' => $key]);
    if ($exists->fetchColumn() !== false) {
        neximatrix_http_error('A payment method with that key already exists.', 409);
    }

    $walletAddress = neximatrix_string($input['wallet_address'] ?? '', 0, 255);

    $stmt = $pdo->prepare(
        'INSERT INTO payment_method_display_configs (method_key, display_name, description, icon_path, display_order, is_enabled, is_sandbox, supported_currencies, public_instructions, wallet_address, status, created_by)
         VALUES (:method_key, :display_name, :description, :icon_path, :display_order, :is_enabled, :is_sandbox, :supported_currencies, :public_instructions, :wallet_address, :status, :created_by)'
    );
    $stmt->execute([
        ':method_key' => $key,
        ':display_name' => $name,
        ':description' => neximatrix_string($input['description'] ?? '', 0, 500),
        ':icon_path' => neximatrix_string($input['icon_path'] ?? '', 0, 255),
        ':display_order' => (int) ($input['display_order'] ?? 0),
        ':is_enabled' => filter_var($input['is_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
        ':is_sandbox' => filter_var($input['is_sandbox'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
        ':supported_currencies' => neximatrix_string($input['supported_currencies'] ?? '', 0, 255),
        ':public_instructions' => neximatrix_string($input['public_instructions'] ?? '', 0, 5000),
        ':wallet_address' => $walletAddress !== '' ? $walletAddress : null,
        ':status' => in_array($input['status'] ?? '', ['active', 'archived'], true) ? $input['status'] : 'active',
        ':created_by' => $adminId,
    ]);
    $id = (int) $pdo->lastInsertId();
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.payment_method.created', 'payment_method', $id, ['method_key' => $key]);
    return neximatrix_admin_payment_method_get($pdo, $id);
}

function neximatrix_admin_payment_method_update(PDO $pdo, int $id, array $input, int $adminId): array
{
    $method = neximatrix_admin_payment_method_get($pdo, $id);
    if ($method === null) {
        neximatrix_http_error('Payment method not found.', 404);
    }

    $fields = [];
    $params = [':id' => $id];

    if (array_key_exists('display_name', $input)) {
        $name = neximatrix_string($input['display_name'], 2, 120);
        if ($name === '') neximatrix_http_error('Display name is required.', 422);
        $fields[] = 'display_name = :display_name';
        $params[':display_name'] = $name;
    }
    if (array_key_exists('description', $input)) {
        $fields[] = 'description = :description';
        $params[':description'] = neximatrix_string($input['description'], 0, 500);
    }
    if (array_key_exists('icon_path', $input)) {
        $fields[] = 'icon_path = :icon_path';
        $params[':icon_path'] = neximatrix_string($input['icon_path'], 0, 255);
    }
    if (array_key_exists('display_order', $input)) {
        $fields[] = 'display_order = :display_order';
        $params[':display_order'] = (int) $input['display_order'];
    }
    if (array_key_exists('is_enabled', $input)) {
        $fields[] = 'is_enabled = :is_enabled';
        $params[':is_enabled'] = filter_var($input['is_enabled'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }
    if (array_key_exists('is_sandbox', $input)) {
        $fields[] = 'is_sandbox = :is_sandbox';
        $params[':is_sandbox'] = filter_var($input['is_sandbox'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }
    if (array_key_exists('supported_currencies', $input)) {
        $fields[] = 'supported_currencies = :supported_currencies';
        $params[':supported_currencies'] = neximatrix_string($input['supported_currencies'], 0, 255);
    }
    if (array_key_exists('public_instructions', $input)) {
        $fields[] = 'public_instructions = :public_instructions';
        $params[':public_instructions'] = neximatrix_string($input['public_instructions'], 0, 5000);
    }
    if (array_key_exists('wallet_address', $input)) {
        $walletAddress = neximatrix_string($input['wallet_address'], 0, 255);
        $fields[] = 'wallet_address = :wallet_address';
        $params[':wallet_address'] = $walletAddress !== '' ? $walletAddress : null;
    }
    if (array_key_exists('status', $input)) {
        if (!in_array($input['status'], ['active', 'archived'], true)) {
            neximatrix_http_error('Invalid status.', 422);
        }
        $fields[] = 'status = :status';
        $params[':status'] = $input['status'];
    }

    if ($fields === []) {
        neximatrix_http_error('No fields to update.', 422);
    }

    $pdo->prepare('UPDATE payment_method_display_configs SET ' . implode(', ', $fields) . ', updated_at = UTC_TIMESTAMP() WHERE id = :id')->execute($params);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.payment_method.updated', 'payment_method', $id, ['fields' => array_keys($input)]);
    return neximatrix_admin_payment_method_get($pdo, $id);
}

function neximatrix_admin_payment_method_archive(PDO $pdo, int $id, int $adminId): void
{
    $method = neximatrix_admin_payment_method_get($pdo, $id);
    if ($method === null) {
        neximatrix_http_error('Payment method not found.', 404);
    }
    $pdo->prepare("UPDATE payment_method_display_configs SET status = 'archived', updated_at = UTC_TIMESTAMP() WHERE id = :id")->execute([':id' => $id]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.payment_method.archived', 'payment_method', $id);
}

function neximatrix_admin_payment_method_restore(PDO $pdo, int $id, int $adminId): array
{
    $method = neximatrix_admin_payment_method_get($pdo, $id);
    if ($method === null) {
        neximatrix_http_error('Payment method not found.', 404);
    }
    $pdo->prepare("UPDATE payment_method_display_configs SET status = 'active', updated_at = UTC_TIMESTAMP() WHERE id = :id")->execute([':id' => $id]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.payment_method.restored', 'payment_method', $id);
    return neximatrix_admin_payment_method_get($pdo, $id);
}
