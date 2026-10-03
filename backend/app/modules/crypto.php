<?php
declare(strict_types=1);

function neximatrix_crypto_networks_list(PDO $pdo): array
{
    $stmt = $pdo->query(
        "SELECT cn.id, cn.network_key, cn.display_name, cn.currency_symbol, cn.description,
                COALESCE(pmd.wallet_address, cn.wallet_address) AS wallet_address,
                cn.qr_code_path, cn.is_enabled, cn.display_order, cn.min_deposit, cn.max_deposit,
                pmd.public_instructions AS payment_instructions
         FROM crypto_networks cn
         LEFT JOIN payment_method_display_configs pmd ON pmd.method_key = cn.network_key AND pmd.is_enabled = 1 AND pmd.status = 'active'
         WHERE cn.is_enabled = 1
         ORDER BY cn.display_order ASC"
    );
    $networks = $stmt->fetchAll();
    foreach ($networks as &$network) {
        $network['id'] = (int) $network['id'];
        $network['is_enabled'] = (bool) $network['is_enabled'];
        $network['display_order'] = (int) $network['display_order'];
        $network['min_deposit'] = $network['min_deposit'] !== null ? (float) $network['min_deposit'] : null;
        $network['max_deposit'] = $network['max_deposit'] !== null ? (float) $network['max_deposit'] : null;
    }
    return $networks;
}

function neximatrix_crypto_network_get(PDO $pdo, int $networkId): ?array
{
    $stmt = $pdo->prepare(
        "SELECT cn.id, cn.network_key, cn.display_name, cn.currency_symbol, cn.description,
                COALESCE(pmd.wallet_address, cn.wallet_address) AS wallet_address,
                cn.qr_code_path, cn.is_enabled, cn.display_order, cn.min_deposit, cn.max_deposit,
                pmd.public_instructions AS payment_instructions
         FROM crypto_networks cn
         LEFT JOIN payment_method_display_configs pmd ON pmd.method_key = cn.network_key AND pmd.is_enabled = 1 AND pmd.status = 'active'
         WHERE cn.id = :id AND cn.is_enabled = 1 LIMIT 1"
    );
    $stmt->execute([':id' => $networkId]);
    $network = $stmt->fetch();
    if ($network === false) return null;
    $network['id'] = (int) $network['id'];
    $network['is_enabled'] = (bool) $network['is_enabled'];
    $network['display_order'] = (int) $network['display_order'];
    $network['min_deposit'] = $network['min_deposit'] !== null ? (float) $network['min_deposit'] : null;
    $network['max_deposit'] = $network['max_deposit'] !== null ? (float) $network['max_deposit'] : null;
    return $network;
}

function neximatrix_crypto_network_by_key(PDO $pdo, string $networkKey): ?array
{
    $stmt = $pdo->prepare(
        'SELECT id, network_key, display_name, currency_symbol, description, wallet_address, qr_code_path, is_enabled, display_order, min_deposit, max_deposit
         FROM crypto_networks WHERE network_key = :key AND is_enabled = 1 LIMIT 1'
    );
    $stmt->execute([':key' => $networkKey]);
    $network = $stmt->fetch();
    if ($network === false) return null;
    $network['id'] = (int) $network['id'];
    $network['is_enabled'] = (bool) $network['is_enabled'];
    $network['display_order'] = (int) $network['display_order'];
    $network['min_deposit'] = $network['min_deposit'] !== null ? (float) $network['min_deposit'] : null;
    $network['max_deposit'] = $network['max_deposit'] !== null ? (float) $network['max_deposit'] : null;
    return $network;
}

function neximatrix_create_crypto_deposit(PDO $pdo, int $userId, float $amount, int $networkId, string $reference = '', ?string $evidencePath = null, ?int $planId = null, string $payerAccount = '', string $idempotencyKey = ''): array
{
    $network = neximatrix_crypto_network_get($pdo, $networkId);
    if ($network === null) {
        neximatrix_http_error('Invalid or disabled network.', 422);
    }

    $minDeposit = $network['min_deposit'] ?? 1;
    $maxDeposit = $network['max_deposit'] ?? 100000;
    if ($amount < $minDeposit || $amount > $maxDeposit) {
        neximatrix_http_error('Amount is outside the allowed range for this network.', 422);
    }

    // Validate plan if provided
    $planName = null;
    if ($planId !== null && $planId > 0) {
        $plan = neximatrix_get_plan($pdo, $planId);
        if ($plan === null || !$plan['is_active']) {
            neximatrix_http_error('Selected plan is not available.', 422);
        }
        if ($amount < $plan['min_deposit'] || $amount > $plan['max_deposit']) {
            neximatrix_http_error('Amount is outside the selected plan limits.', 422);
        }
        $planName = $plan['name'];
    }

    // Calculate deposit fee
    $feeData = neximatrix_get_deposit_fee($pdo, $amount);
    $depositFee = $feeData['fee'];
    $creditAmount = $feeData['credit_amount'];

    $requestReference = 'DEP-' . strtoupper(bin2hex(random_bytes(6)));
    $walletAddress = $network['wallet_address'] ?? null;

    $stmt = $pdo->prepare(
        'INSERT INTO deposits (user_id, plan_id, amount, deposit_fee, credit_amount, method, network, reference, payer_account, request_reference, idempotency_key, proof_file, wallet_snapshot, status, created_at, updated_at)
         VALUES (:user_id, :plan_id, :amount, :deposit_fee, :credit_amount, :method, :network, :reference, :payer_account, :request_reference, :idempotency_key, :proof_file, :wallet_snapshot, \'pending\', UTC_TIMESTAMP(), UTC_TIMESTAMP())'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':plan_id' => $planId,
        ':amount' => $amount,
        ':deposit_fee' => $depositFee,
        ':credit_amount' => $creditAmount,
        ':method' => $network['network_key'],
        ':network' => $network['display_name'],
        ':reference' => $reference !== '' ? $reference : null,
        ':payer_account' => $payerAccount !== '' ? $payerAccount : null,
        ':request_reference' => $requestReference,
        ':idempotency_key' => $idempotencyKey !== '' ? $idempotencyKey : null,
        ':proof_file' => $evidencePath,
        ':wallet_snapshot' => $walletAddress,
    ]);

    $depositId = (int) $pdo->lastInsertId();

    return [
        'id' => $depositId,
        'user_id' => $userId,
        'plan_id' => $planId,
        'plan_name' => $planName,
        'amount' => $amount,
        'deposit_fee' => $depositFee,
        'credit_amount' => $creditAmount,
        'method' => $network['network_key'],
        'network' => $network['display_name'],
        'wallet_address' => $walletAddress,
        'reference' => $reference !== '' ? $reference : null,
        'payer_account' => $payerAccount !== '' ? $payerAccount : null,
        'request_reference' => $requestReference,
        'proof_file' => $evidencePath,
        'status' => 'pending',
        'created_at' => gmdate('Y-m-d H:i:s'),
        'updated_at' => gmdate('Y-m-d H:i:s'),
    ];
}

function neximatrix_admin_review_crypto_deposit(PDO $pdo, int $depositId, string $status, int $adminId, string $note = ''): void
{
    if (!in_array($status, ['approved', 'rejected'], true)) {
        neximatrix_http_error('Invalid status.', 422);
    }

    $stmt = $pdo->prepare('SELECT id, status, user_id, amount, credit_amount, deposit_fee FROM deposits WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $depositId]);
    $deposit = $stmt->fetch();
    if ($deposit === false) {
        neximatrix_http_error('Deposit not found.', 404);
    }
    if ($deposit['status'] !== 'pending') {
        neximatrix_http_error('Only pending deposits can be reviewed.', 422);
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE deposits SET status = :status, admin_note = :note, reviewed_by = :admin_id, reviewed_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = :id')
            ->execute([
                ':status' => $status,
                ':note' => $note !== '' ? $note : null,
                ':admin_id' => $adminId,
                ':id' => $depositId,
            ]);

        // Credit wallet with credit_amount (amount minus fee) on approval
        if ($status === 'approved') {
            $creditAmount = (float) ($deposit['credit_amount'] ?? $deposit['amount']);
            neximatrix_credit_wallet($pdo, (int) $deposit['user_id'], $creditAmount, 'deposit', $depositId, 'deposit', 'Deposit approved');
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function neximatrix_admin_crypto_deposit_detail(PDO $pdo, int $depositId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT d.*, u.username, u.full_name, u.email, p.name AS plan_name
         FROM deposits d
         INNER JOIN users u ON u.id = d.user_id
         LEFT JOIN investment_plans p ON p.id = d.plan_id
         WHERE d.id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $depositId]);
    $deposit = $stmt->fetch();
    if ($deposit === false) return null;
    $deposit['id'] = (int) $deposit['id'];
    $deposit['user_id'] = (int) $deposit['user_id'];
    $deposit['amount'] = (float) $deposit['amount'];
    $deposit['deposit_fee'] = (float) ($deposit['deposit_fee'] ?? 0);
    $deposit['credit_amount'] = (float) ($deposit['credit_amount'] ?? 0);
    $deposit['reviewed_by'] = $deposit['reviewed_by'] !== null ? (int) $deposit['reviewed_by'] : null;
    return $deposit;
}

function neximatrix_stage_deposit_evidence(array $file, int $userId): string
{
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    $maxSize = 5 * 1024 * 1024; // 5MB

    if ($file['size'] > $maxSize) {
        neximatrix_http_error('File is too large. Maximum size is 5MB.', 422);
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    if (!in_array($mimeType, $allowedTypes, true)) {
        neximatrix_http_error('Invalid file type. Only JPG, PNG, WebP, and PDF are allowed.', 422);
    }

    $extension = match ($mimeType) {
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
        default => 'bin',
    };

    $filename = 'deposit_' . $userId . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
    $storageDir = dirname(__DIR__, 2) . '/storage/deposits';

    if (!is_dir($storageDir)) {
        mkdir($storageDir, 0750, true);
    }

    $destination = $storageDir . '/' . $filename;
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        neximatrix_http_error('Failed to store uploaded file.', 500);
    }

    return 'storage/deposits/' . $filename;
}
