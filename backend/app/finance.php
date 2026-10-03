<?php
declare(strict_types=1);

// ─── Wallet ───────────────────────────────────────────────────────────────────

function neximatrix_get_wallet(PDO $pdo, int $userId): array
{
    $statement = $pdo->prepare('SELECT id, user_id, balance, currency, created_at, updated_at FROM wallets WHERE user_id = :user_id LIMIT 1');
    $statement->execute([':user_id' => $userId]);
    $wallet = $statement->fetch();
    if ($wallet === false) {
        $insert = $pdo->prepare('INSERT INTO wallets (user_id, balance, currency) VALUES (:user_id, 0, :currency)');
        $insert->execute([':user_id' => $userId, ':currency' => 'USD']);
        $statement->execute([':user_id' => $userId]);
        $wallet = $statement->fetch();
    }
    $wallet['balance'] = (float) $wallet['balance'];
    return $wallet;
}

function neximatrix_wallet_balance(PDO $pdo, int $userId): float
{
    $wallet = neximatrix_get_wallet($pdo, $userId);
    return $wallet['balance'];
}

function neximatrix_credit_wallet(PDO $pdo, int $userId, float $amount, string $type, ?int $referenceId = null, ?string $referenceType = null, string $description = ''): void
{
    $startedTransaction = !$pdo->inTransaction();
    if ($startedTransaction) {
        $pdo->beginTransaction();
    }
    try {
        $wallet = neximatrix_get_wallet($pdo, $userId);
        $balanceBefore = (float) $wallet['balance'];
        $balanceAfter = $balanceBefore + $amount;

        $pdo->prepare('UPDATE wallets SET balance = :balance, updated_at = UTC_TIMESTAMP() WHERE user_id = :user_id')
            ->execute([':balance' => $balanceAfter, ':user_id' => $userId]);

        $pdo->prepare(
            'INSERT INTO transactions (user_id, type, amount, fee, balance_before, balance_after, reference_id, reference_type, description, status)
             VALUES (:user_id, :type, :amount, 0, :balance_before, :balance_after, :reference_id, :reference_type, :description, \'completed\')'
        )->execute([
            ':user_id' => $userId,
            ':type' => $type,
            ':amount' => $amount,
            ':balance_before' => $balanceBefore,
            ':balance_after' => $balanceAfter,
            ':reference_id' => $referenceId,
            ':reference_type' => $referenceType,
            ':description' => $description,
        ]);

        if ($startedTransaction) {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($startedTransaction && $pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function neximatrix_debit_wallet(PDO $pdo, int $userId, float $amount, string $type, ?int $referenceId = null, ?string $referenceType = null, string $description = ''): void
{
    $startedTransaction = !$pdo->inTransaction();
    if ($startedTransaction) {
        $pdo->beginTransaction();
    }
    try {
        $wallet = neximatrix_get_wallet($pdo, $userId);
        $balanceBefore = (float) $wallet['balance'];
        if ($balanceBefore < $amount) {
            neximatrix_http_error('Insufficient balance.', 422);
        }
        $balanceAfter = $balanceBefore - $amount;

        $pdo->prepare('UPDATE wallets SET balance = :balance, updated_at = UTC_TIMESTAMP() WHERE user_id = :user_id')
            ->execute([':balance' => $balanceAfter, ':user_id' => $userId]);

        $pdo->prepare(
            'INSERT INTO transactions (user_id, type, amount, fee, balance_before, balance_after, reference_id, reference_type, description, status)
             VALUES (:user_id, :type, :amount, 0, :balance_before, :balance_after, :reference_id, :reference_type, :description, \'completed\')'
        )->execute([
            ':user_id' => $userId,
            ':type' => $type,
            ':amount' => $amount,
            ':balance_before' => $balanceBefore,
            ':balance_after' => $balanceAfter,
            ':reference_id' => $referenceId,
            ':reference_type' => $referenceType,
            ':description' => $description,
        ]);

        if ($startedTransaction) {
            $pdo->commit();
        }
    } catch (Throwable $e) {
        if ($startedTransaction && $pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

// ─── Transactions ─────────────────────────────────────────────────────────────

function neximatrix_list_transactions(PDO $pdo, int $userId, int $limit = 50, int $offset = 0, string $type = ''): array
{
    $where = 't.user_id = :user_id';
    $params = [':user_id' => $userId];
    if ($type !== '') {
        $where .= ' AND t.type = :type';
        $params[':type'] = $type;
    }
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM transactions t WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "SELECT t.id, t.type, t.amount, t.fee, t.balance_before, t.balance_after,
                   t.reference_id, t.reference_type, t.description, t.status, t.created_at
            FROM transactions t WHERE {$where}
            ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();
    foreach ($items as &$item) {
        $item['amount'] = (float) $item['amount'];
        $item['fee'] = (float) $item['fee'];
        $item['balance_before'] = (float) $item['balance_before'];
        $item['balance_after'] = (float) $item['balance_after'];
    }
    return ['items' => $items, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
}

// ─── Investment Plans ─────────────────────────────────────────────────────────

function neximatrix_list_plans(PDO $pdo, bool $activeOnly = true): array
{
    $where = $activeOnly ? 'WHERE is_active = 1' : '';
    $stmt = $pdo->query("SELECT id, name, description, min_deposit, max_deposit, daily_return, duration_days, total_return, is_active, sort_order FROM investment_plans {$where} ORDER BY sort_order ASC");
    $plans = $stmt->fetchAll();
    foreach ($plans as &$plan) {
        $plan['min_deposit'] = (float) $plan['min_deposit'];
        $plan['max_deposit'] = (float) $plan['max_deposit'];
        $plan['daily_return'] = (float) $plan['daily_return'];
        $plan['total_return'] = (float) $plan['total_return'];
        $plan['duration_days'] = (int) $plan['duration_days'];
        $plan['is_active'] = (bool) $plan['is_active'];
    }
    return $plans;
}

function neximatrix_get_plan(PDO $pdo, int $planId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM investment_plans WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $planId]);
    $plan = $stmt->fetch();
    if ($plan === false) return null;
    $plan['min_deposit'] = (float) $plan['min_deposit'];
    $plan['max_deposit'] = (float) $plan['max_deposit'];
    $plan['daily_return'] = (float) $plan['daily_return'];
    $plan['total_return'] = (float) $plan['total_return'];
    $plan['duration_days'] = (int) $plan['duration_days'];
    $plan['is_active'] = (bool) $plan['is_active'];
    return $plan;
}

// ─── Investments ──────────────────────────────────────────────────────────────

function neximatrix_create_investment(PDO $pdo, int $userId, int $planId, float $amount): array
{
    $plan = neximatrix_get_plan($pdo, $planId);
    if ($plan === null || !$plan['is_active']) {
        neximatrix_http_error('Investment plan not found.', 404);
    }
    if ($amount < $plan['min_deposit'] || $amount > $plan['max_deposit']) {
        neximatrix_http_error('Amount is outside the plan limits.', 422);
    }

    $balance = neximatrix_wallet_balance($pdo, $userId);
    if ($balance < $amount) {
        neximatrix_http_error('Insufficient balance for this investment.', 422);
    }

    $pdo->beginTransaction();
    try {
        // Debit wallet
        $newBalance = $balance - $amount;
        $pdo->prepare('UPDATE wallets SET balance = :balance, updated_at = UTC_TIMESTAMP() WHERE user_id = :user_id')
            ->execute([':balance' => $newBalance, ':user_id' => $userId]);

        // Record transaction
        $pdo->prepare(
            'INSERT INTO transactions (user_id, type, amount, fee, balance_before, balance_after, reference_type, description, status)
             VALUES (:user_id, \'investment\', :amount, 0, :balance_before, :balance_after, \'investment\', :description, \'completed\')'
        )->execute([
            ':user_id' => $userId,
            ':amount' => $amount,
            ':balance_before' => $balance,
            ':balance_after' => $newBalance,
            ':description' => "Investment in {$plan['name']}",
        ]);
        $txnId = (int) $pdo->lastInsertId();

        // Create investment
        $startsAt = gmdate('Y-m-d H:i:s');
        $endsAt = gmdate('Y-m-d H:i:s', time() + $plan['duration_days'] * 86400);
        $stmt = $pdo->prepare(
            'INSERT INTO investments (user_id, plan_id, amount, daily_return, duration_days, total_return, starts_at, ends_at, status)
             VALUES (:user_id, :plan_id, :amount, :daily_return, :duration_days, :total_return, :starts_at, :ends_at, \'active\')'
        );
        $stmt->execute([
            ':user_id' => $userId,
            ':plan_id' => $planId,
            ':amount' => $amount,
            ':daily_return' => $plan['daily_return'],
            ':duration_days' => $plan['duration_days'],
            ':total_return' => $plan['total_return'],
            ':starts_at' => $startsAt,
            ':ends_at' => $endsAt,
        ]);
        $investmentId = (int) $pdo->lastInsertId();

        // Update transaction reference
        $pdo->prepare('UPDATE transactions SET reference_id = :ref_id WHERE id = :id')
            ->execute([':ref_id' => $investmentId, ':id' => $txnId]);

        $pdo->commit();
        return neximatrix_get_investment($pdo, $investmentId, $userId);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function neximatrix_get_investment(PDO $pdo, int $investmentId, ?int $userId = null): ?array
{
    $sql = 'SELECT i.*, p.name AS plan_name FROM investments i INNER JOIN investment_plans p ON p.id = i.plan_id WHERE i.id = :id';
    $params = [':id' => $investmentId];
    if ($userId !== null) {
        $sql .= ' AND i.user_id = :user_id';
        $params[':user_id'] = $userId;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $inv = $stmt->fetch();
    if ($inv === false) return null;
    $inv['amount'] = (float) $inv['amount'];
    $inv['daily_return'] = (float) $inv['daily_return'];
    $inv['total_return'] = (float) $inv['total_return'];
    $inv['profit_earned'] = (float) $inv['profit_earned'];
    return $inv;
}

function neximatrix_list_investments(PDO $pdo, int $userId, int $limit = 50, int $offset = 0, string $status = ''): array
{
    $where = 'i.user_id = :user_id';
    $params = [':user_id' => $userId];
    if ($status !== '') {
        $where .= ' AND i.status = :status';
        $params[':status'] = $status;
    }
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM investments i WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "SELECT i.id, i.user_id, i.plan_id, i.amount, i.daily_return, i.duration_days, i.total_return,
                   i.profit_earned, i.last_profit_at, i.starts_at, i.ends_at, i.status, i.created_at,
                   p.name AS plan_name
            FROM investments i INNER JOIN investment_plans p ON p.id = i.plan_id
            WHERE {$where} ORDER BY i.created_at DESC LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();
    foreach ($items as &$item) {
        $item['amount'] = (float) $item['amount'];
        $item['daily_return'] = (float) $item['daily_return'];
        $item['total_return'] = (float) $item['total_return'];
        $item['profit_earned'] = (float) $item['profit_earned'];
    }
    return ['items' => $items, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
}

function neximatrix_process_daily_profits(PDO $pdo): int
{
    $now = gmdate('Y-m-d H:i:s');
    $stmt = $pdo->prepare(
        "SELECT i.*, w.balance AS wallet_balance
         FROM investments i
         INNER JOIN wallets w ON w.user_id = i.user_id
         WHERE i.status = 'active'
           AND i.ends_at > '{$now}'
           AND (i.last_profit_at IS NULL OR i.last_profit_at < DATE_SUB('{$now}', INTERVAL 23 HOUR))
         LIMIT 100"
    );
    $stmt->execute();
    $investments = $stmt->fetchAll();
    $processed = 0;

    foreach ($investments as $inv) {
        $dailyProfit = (float) $inv['amount'] * ((float) $inv['daily_return'] / 100);
        if ($dailyProfit <= 0) continue;

        $pdo->beginTransaction();
        try {
            $newBalance = (float) $inv['wallet_balance'] + $dailyProfit;
            $pdo->prepare('UPDATE wallets SET balance = :balance, updated_at = UTC_TIMESTAMP() WHERE user_id = :user_id')
                ->execute([':balance' => $newBalance, ':user_id' => $inv['user_id']]);

            $newProfitEarned = (float) $inv['profit_earned'] + $dailyProfit;
            $pdo->prepare('UPDATE investments SET profit_earned = :profit, last_profit_at = :now WHERE id = :id')
                ->execute([':profit' => $newProfitEarned, ':now' => $now, ':id' => $inv['id']]);

            $pdo->prepare(
                'INSERT INTO transactions (user_id, type, amount, fee, balance_before, balance_after, reference_id, reference_type, description, status)
                 VALUES (:user_id, \'profit\', :amount, 0, :balance_before, :balance_after, :ref_id, \'investment\', :description, \'completed\')'
            )->execute([
                ':user_id' => $inv['user_id'],
                ':amount' => $dailyProfit,
                ':balance_before' => $inv['wallet_balance'],
                ':balance_after' => $newBalance,
                ':ref_id' => $inv['id'],
                ':description' => "Daily profit from {$inv['plan_name']}",
            ]);

            $pdo->commit();
            $processed++;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
        }
    }

    // Complete expired investments
    $pdo->prepare(
        "UPDATE investments SET status = 'completed', updated_at = UTC_TIMESTAMP()
         WHERE status = 'active' AND ends_at <= '{$now}'"
    )->execute();

    return $processed;
}

// ─── Deposits ─────────────────────────────────────────────────────────────────

function neximatrix_create_deposit(PDO $pdo, int $userId, float $amount, string $method, string $reference = ''): array
{
    if ($amount <= 0) {
        neximatrix_http_error('Deposit amount must be positive.', 422);
    }
    $stmt = $pdo->prepare(
        'INSERT INTO deposits (user_id, amount, method, reference, status) VALUES (:user_id, :amount, :method, :reference, \'pending\')'
    );
    $stmt->execute([
        ':user_id' => $userId,
        ':amount' => $amount,
        ':method' => $method,
        ':reference' => $reference,
    ]);
    return neximatrix_get_deposit($pdo, (int) $pdo->lastInsertId(), $userId);
}

function neximatrix_get_deposit(PDO $pdo, int $depositId, ?int $userId = null): ?array
{
    $sql = 'SELECT * FROM deposits WHERE id = :id';
    $params = [':id' => $depositId];
    if ($userId !== null) {
        $sql .= ' AND user_id = :user_id';
        $params[':user_id'] = $userId;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $deposit = $stmt->fetch();
    if ($deposit === false) return null;
    $deposit['amount'] = (float) $deposit['amount'];
    return $deposit;
}

function neximatrix_list_deposits(PDO $pdo, int $userId, int $limit = 50, int $offset = 0, string $status = ''): array
{
    $where = 'user_id = :user_id';
    $params = [':user_id' => $userId];
    if ($status !== '') {
        $where .= ' AND status = :status';
        $params[':status'] = $status;
    }
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM deposits WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM deposits WHERE {$where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();
    foreach ($items as &$item) {
        $item['amount'] = (float) $item['amount'];
    }
    return ['items' => $items, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
}

function neximatrix_list_all_deposits(PDO $pdo, string $status = '', int $limit = 50, int $offset = 0, string $search = ''): array
{
    $where = '1 = 1';
    $params = [];
    if ($status !== '') {
        $where .= ' AND d.status = :status';
        $params[':status'] = $status;
    }
    if ($search !== '') {
        $where .= ' AND (d.request_reference LIKE :search OR u.username LIKE :search OR u.full_name LIKE :search OR u.email LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM deposits d INNER JOIN users u ON u.id = d.user_id WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "SELECT d.*, u.username, u.full_name, u.email
            FROM deposits d INNER JOIN users u ON u.id = d.user_id
            WHERE {$where} ORDER BY d.created_at DESC LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();
    foreach ($items as &$item) {
        $item['amount'] = (float) $item['amount'];
        $item['deposit_fee'] = (float) ($item['deposit_fee'] ?? 0);
        $item['credit_amount'] = (float) ($item['credit_amount'] ?? 0);
    }
    return ['items' => $items, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
}

function neximatrix_review_deposit(PDO $pdo, int $depositId, string $status, int $adminId, string $note = ''): void
{
    if (!in_array($status, ['approved', 'rejected'], true)) {
        neximatrix_http_error('Invalid deposit status.', 422);
    }
    $deposit = neximatrix_get_deposit($pdo, $depositId);
    if ($deposit === null) {
        neximatrix_http_error('Deposit not found.', 404);
    }
    if ($deposit['status'] !== 'pending') {
        neximatrix_http_error('Deposit has already been reviewed.', 422);
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE deposits SET status = :status, reviewed_by = :admin_id, reviewed_at = UTC_TIMESTAMP(), admin_note = :note WHERE id = :id')
            ->execute([':status' => $status, ':admin_id' => $adminId, ':note' => $note, ':id' => $depositId]);

        if ($status === 'approved') {
            neximatrix_credit_wallet($pdo, (int) $deposit['user_id'], (float) $deposit['amount'], 'deposit', $depositId, 'deposit', 'Deposit approved');
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

// ─── Deposit Fee ──────────────────────────────────────────────────────────────

function neximatrix_get_deposit_fee(PDO $pdo, float $amount): array
{
    $percent = 0.0;
    $fixed = 0.0;
    $minFee = 0.0;
    $maxFee = 0.0;

    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'deposit_fee_percent' LIMIT 1");
        $stmt->execute();
        $val = $stmt->fetchColumn();
        if (is_string($val) && $val !== '') {
            $percent = (float) $val;
        }
    } catch (Throwable) {
        // setting not found, use default
    }

    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'deposit_fee_fixed' LIMIT 1");
        $stmt->execute();
        $val = $stmt->fetchColumn();
        if (is_string($val) && $val !== '') {
            $fixed = (float) $val;
        }
    } catch (Throwable) {
        // setting not found, use default
    }

    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'deposit_fee_min' LIMIT 1");
        $stmt->execute();
        $val = $stmt->fetchColumn();
        if (is_string($val) && $val !== '') {
            $minFee = (float) $val;
        }
    } catch (Throwable) {
        // setting not found, use default
    }

    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM site_settings WHERE setting_key = 'deposit_fee_max' LIMIT 1");
        $stmt->execute();
        $val = $stmt->fetchColumn();
        if (is_string($val) && $val !== '') {
            $maxFee = (float) $val;
        }
    } catch (Throwable) {
        // setting not found, use default
    }

    $fee = ($amount * $percent / 100) + $fixed;

    if ($minFee > 0 && $fee < $minFee) {
        $fee = $minFee;
    }
    if ($maxFee > 0 && $fee > $maxFee) {
        $fee = $maxFee;
    }

    $fee = round($fee, 8);
    $creditAmount = round($amount - $fee, 8);

    return [
        'fee' => $fee,
        'credit_amount' => $creditAmount,
        'percent' => $percent,
        'fixed' => $fixed,
        'min_fee' => $minFee,
        'max_fee' => $maxFee,
    ];
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────

function neximatrix_create_withdrawal(PDO $pdo, int $userId, float $amount, string $method, string $walletAddress): array
{
    if ($amount <= 0) {
        neximatrix_http_error('Withdrawal amount must be positive.', 422);
    }
    if ($walletAddress === '') {
        neximatrix_http_error('Wallet address is required.', 422);
    }
    if (strlen($walletAddress) < 8 || strlen($walletAddress) > 190) {
        neximatrix_http_error('Wallet address must be between 8 and 190 characters.', 422);
    }
    if (!preg_match('/^[a-zA-Z0-9]+$/', $walletAddress)) {
        neximatrix_http_error('Wallet address contains invalid characters.', 422);
    }

    $balance = neximatrix_wallet_balance($pdo, $userId);
    $fee = round($amount * 0.02, 8); // 2% withdrawal fee
    $netAmount = $amount - $fee;

    if ($balance < $amount) {
        neximatrix_http_error('Insufficient balance for withdrawal.', 422);
    }

    $pdo->beginTransaction();
    try {
        // Debit wallet
        $newBalance = $balance - $amount;
        $pdo->prepare('UPDATE wallets SET balance = :balance, updated_at = UTC_TIMESTAMP() WHERE user_id = :user_id')
            ->execute([':balance' => $newBalance, ':user_id' => $userId]);

        // Record transaction
        $pdo->prepare(
            'INSERT INTO transactions (user_id, type, amount, fee, balance_before, balance_after, reference_type, description, status)
             VALUES (:user_id, \'withdrawal\', :amount, :fee, :balance_before, :balance_after, \'withdrawal\', :description, \'pending\')'
        )->execute([
            ':user_id' => $userId,
            ':amount' => $amount,
            ':fee' => $fee,
            ':balance_before' => $balance,
            ':balance_after' => $newBalance,
            ':description' => "Withdrawal request ({$method})",
        ]);
        $txnId = (int) $pdo->lastInsertId();

        // Create withdrawal record
        $stmt = $pdo->prepare(
            'INSERT INTO withdrawals (user_id, amount, fee, net_amount, method, wallet_address, status)
             VALUES (:user_id, :amount, :fee, :net_amount, :method, :wallet_address, \'pending\')'
        );
        $stmt->execute([
            ':user_id' => $userId,
            ':amount' => $amount,
            ':fee' => $fee,
            ':net_amount' => $netAmount,
            ':method' => $method,
            ':wallet_address' => $walletAddress,
        ]);
        $withdrawalId = (int) $pdo->lastInsertId();

        $pdo->prepare('UPDATE transactions SET reference_id = :ref_id WHERE id = :id')
            ->execute([':ref_id' => $withdrawalId, ':id' => $txnId]);

        $pdo->commit();
        return neximatrix_get_withdrawal($pdo, $withdrawalId, $userId);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function neximatrix_get_withdrawal(PDO $pdo, int $withdrawalId, ?int $userId = null): ?array
{
    $sql = 'SELECT * FROM withdrawals WHERE id = :id';
    $params = [':id' => $withdrawalId];
    if ($userId !== null) {
        $sql .= ' AND user_id = :user_id';
        $params[':user_id'] = $userId;
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $w = $stmt->fetch();
    if ($w === false) return null;
    $w['amount'] = (float) $w['amount'];
    $w['fee'] = (float) $w['fee'];
    $w['net_amount'] = (float) $w['net_amount'];
    return $w;
}

function neximatrix_list_withdrawals(PDO $pdo, int $userId, int $limit = 50, int $offset = 0, string $status = ''): array
{
    $where = 'user_id = :user_id';
    $params = [':user_id' => $userId];
    if ($status !== '') {
        $where .= ' AND status = :status';
        $params[':status'] = $status;
    }
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM withdrawals WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT * FROM withdrawals WHERE {$where} ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();
    foreach ($items as &$item) {
        $item['amount'] = (float) $item['amount'];
        $item['fee'] = (float) $item['fee'];
        $item['net_amount'] = (float) $item['net_amount'];
    }
    return ['items' => $items, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
}

function neximatrix_list_all_withdrawals(PDO $pdo, string $status = '', int $limit = 50, int $offset = 0): array
{
    $where = '1 = 1';
    $params = [];
    if ($status !== '') {
        $where .= ' AND w.status = :status';
        $params[':status'] = $status;
    }
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM withdrawals w WHERE {$where}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "SELECT w.*, u.username, u.full_name, u.email
            FROM withdrawals w INNER JOIN users u ON u.id = w.user_id
            WHERE {$where} ORDER BY w.created_at DESC LIMIT :limit OFFSET :offset";
    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) $stmt->bindValue($k, $v);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();
    foreach ($items as &$item) {
        $item['amount'] = (float) $item['amount'];
        $item['fee'] = (float) $item['fee'];
        $item['net_amount'] = (float) $item['net_amount'];
    }
    return ['items' => $items, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
}

function neximatrix_review_withdrawal(PDO $pdo, int $withdrawalId, string $status, int $adminId, string $note = ''): void
{
    if (!in_array($status, ['approved', 'rejected', 'paid'], true)) {
        neximatrix_http_error('Invalid withdrawal status.', 422);
    }
    $withdrawal = neximatrix_get_withdrawal($pdo, $withdrawalId);
    if ($withdrawal === null) {
        neximatrix_http_error('Withdrawal not found.', 404);
    }
    if ($withdrawal['status'] !== 'pending') {
        neximatrix_http_error('Withdrawal has already been reviewed.', 422);
    }

    $pdo->beginTransaction();
    try {
        $paidAt = $status === 'paid' ? gmdate('Y-m-d H:i:s') : null;
        $pdo->prepare('UPDATE withdrawals SET status = :status, reviewed_by = :admin_id, reviewed_at = UTC_TIMESTAMP(), admin_note = :note, paid_at = :paid_at WHERE id = :id')
            ->execute([':status' => $status, ':admin_id' => $adminId, ':note' => $note, ':paid_at' => $paidAt, ':id' => $withdrawalId]);

        // Update transaction status
        $pdo->prepare('UPDATE transactions SET status = :status WHERE reference_type = \'withdrawal\' AND reference_id = :id')
            ->execute([':status' => $status === 'rejected' ? 'failed' : 'completed', ':id' => $withdrawalId]);

        // If rejected, refund the wallet
        if ($status === 'rejected') {
            neximatrix_credit_wallet($pdo, (int) $withdrawal['user_id'], (float) $withdrawal['amount'], 'adjustment', $withdrawalId, 'withdrawal', 'Withdrawal rejected — refund');
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

// ─── Referrals ────────────────────────────────────────────────────────────────

function neximatrix_get_referral(PDO $pdo, int $referrerId, int $referredId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM referrals WHERE referrer_id = :referrer_id AND referred_id = :referred_id LIMIT 1');
    $stmt->execute([':referrer_id' => $referrerId, ':referred_id' => $referredId]);
    $ref = $stmt->fetch();
    if ($ref === false) return null;
    $ref['commission_rate'] = (float) $ref['commission_rate'];
    $ref['total_earned'] = (float) $ref['total_earned'];
    return $ref;
}

function neximatrix_create_referral(PDO $pdo, int $referrerId, int $referredId, float $commissionRate = 0.10): array
{
    if ($referrerId === $referredId) {
        neximatrix_http_error('Cannot refer yourself.', 422);
    }
    $stmt = $pdo->prepare(
        'INSERT INTO referrals (referrer_id, referred_id, commission_rate) VALUES (:referrer_id, :referred_id, :commission_rate)
         ON DUPLICATE KEY UPDATE referrer_id = referrer_id'
    );
    $stmt->execute([
        ':referrer_id' => $referrerId,
        ':referred_id' => $referredId,
        ':commission_rate' => $commissionRate,
    ]);
    return neximatrix_get_referral($pdo, $referrerId, $referredId);
}

function neximatrix_list_referrals(PDO $pdo, int $referrerId, int $limit = 50, int $offset = 0): array
{
    $countStmt = $pdo->prepare('SELECT COUNT(*) FROM referrals WHERE referrer_id = :referrer_id');
    $countStmt->execute([':referrer_id' => $referrerId]);
    $total = (int) $countStmt->fetchColumn();

    $stmt = $pdo->prepare(
        'SELECT r.*, u.username, u.full_name, u.email, u.created_at AS joined_at
         FROM referrals r INNER JOIN users u ON u.id = r.referred_id
         WHERE r.referrer_id = :referrer_id
         ORDER BY r.created_at DESC LIMIT :limit OFFSET :offset'
    );
    $stmt->bindValue(':referrer_id', $referrerId, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $items = $stmt->fetchAll();
    foreach ($items as &$item) {
        $item['commission_rate'] = (float) $item['commission_rate'];
        $item['total_earned'] = (float) $item['total_earned'];
    }
    return ['items' => $items, 'total' => $total, 'limit' => $limit, 'offset' => $offset];
}

function neximatrix_referral_stats(PDO $pdo, int $referrerId): array
{
    $stmt = $pdo->prepare('SELECT COUNT(*) AS total_referrals, COALESCE(SUM(total_earned), 0) AS total_earned FROM referrals WHERE referrer_id = :referrer_id');
    $stmt->execute([':referrer_id' => $referrerId]);
    $stats = $stmt->fetch();
    return [
        'totalReferrals' => (int) $stats['total_referrals'],
        'totalEarned' => (float) $stats['total_earned'],
    ];
}

function neximatrix_credit_referral_bonus(PDO $pdo, int $referrerId, int $referredId, float $amount, float $commissionRate = 0.10): void
{
    $bonus = round($amount * $commissionRate, 8);
    if ($bonus <= 0) return;

    $pdo->beginTransaction();
    try {
        neximatrix_credit_wallet($pdo, $referrerId, $bonus, 'referral_bonus', $referredId, 'user', 'Referral bonus');

        $pdo->prepare('UPDATE referrals SET total_earned = total_earned + :bonus WHERE referrer_id = :referrer_id AND referred_id = :referred_id')
            ->execute([':bonus' => $bonus, ':referrer_id' => $referrerId, ':referred_id' => $referredId]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

// ─── Financial Summary ────────────────────────────────────────────────────────

function neximatrix_financial_summary(PDO $pdo, int $userId): array
{
    $wallet = neximatrix_get_wallet($pdo, $userId);

    $depositStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE user_id = :user_id AND status = 'approved'");
    $depositStmt->execute([':user_id' => $userId]);
    $totalDeposited = (float) $depositStmt->fetchColumn();

    $withdrawalStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE user_id = :user_id AND status IN ('approved', 'paid')");
    $withdrawalStmt->execute([':user_id' => $userId]);
    $totalWithdrawn = (float) $withdrawalStmt->fetchColumn();

    $investmentStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = :user_id AND status = 'active'");
    $investmentStmt->execute([':user_id' => $userId]);
    $activeInvested = (float) $investmentStmt->fetchColumn();

    $profitStmt = $pdo->prepare("SELECT COALESCE(SUM(profit_earned), 0) FROM investments WHERE user_id = :user_id");
    $profitStmt->execute([':user_id' => $userId]);
    $totalProfit = (float) $profitStmt->fetchColumn();

    $referralStats = neximatrix_referral_stats($pdo, $userId);

    return [
        'balance' => (float) $wallet['balance'],
        'currency' => $wallet['currency'],
        'totalDeposited' => $totalDeposited,
        'totalWithdrawn' => $totalWithdrawn,
        'activeInvested' => $activeInvested,
        'totalProfit' => $totalProfit,
        'referralEarnings' => $referralStats['totalEarned'],
        'totalReferrals' => $referralStats['totalReferrals'],
    ];
}

// ─── Admin Financial Functions ────────────────────────────────────────────────

function neximatrix_admin_financial_stats(PDO $pdo): array
{
    $stats = [];
    $queries = [
        'totalUsers' => 'SELECT COUNT(*) FROM users',
        'activeUsers' => "SELECT COUNT(*) FROM users WHERE status = 'active'",
        'totalDeposits' => "SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'approved'",
        'pendingDeposits' => "SELECT COUNT(*) FROM deposits WHERE status = 'pending'",
        'totalWithdrawals' => "SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status IN ('approved', 'paid')",
        'pendingWithdrawals' => "SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'",
        'totalInvested' => "SELECT COALESCE(SUM(amount), 0) FROM investments WHERE status = 'active'",
        'totalProfitPaid' => "SELECT COALESCE(SUM(profit_earned), 0) FROM investments",
        'totalReferralBonuses' => "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'referral_bonus'",
    ];
    foreach ($queries as $key => $sql) {
        $stats[$key] = (float) $pdo->query($sql)->fetchColumn();
    }
    return $stats;
}

function neximatrix_admin_list_plans(PDO $pdo): array
{
    return neximatrix_list_plans($pdo, false);
}

function neximatrix_admin_create_plan(PDO $pdo, array $input, int $adminId): array
{
    $name = neximatrix_string($input['name'] ?? '', 2, 80);
    $minDeposit = (float) ($input['min_deposit'] ?? 0);
    $maxDeposit = (float) ($input['max_deposit'] ?? 0);
    $dailyReturn = (float) ($input['daily_return'] ?? 0);
    $durationDays = (int) ($input['duration_days'] ?? 0);
    $totalReturn = (float) ($input['total_return'] ?? 0);

    if ($name === '' || $minDeposit <= 0 || $maxDeposit <= $minDeposit || $dailyReturn <= 0 || $durationDays <= 0) {
        neximatrix_http_error('Invalid plan parameters.', 422);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO investment_plans (name, description, min_deposit, max_deposit, daily_return, duration_days, total_return, is_active, sort_order)
         VALUES (:name, :description, :min_deposit, :max_deposit, :daily_return, :duration_days, :total_return, 1, :sort_order)'
    );
    $stmt->execute([
        ':name' => $name,
        ':description' => neximatrix_string($input['description'] ?? '', 0, 255),
        ':min_deposit' => $minDeposit,
        ':max_deposit' => $maxDeposit,
        ':daily_return' => $dailyReturn,
        ':duration_days' => $durationDays,
        ':total_return' => $totalReturn,
        ':sort_order' => (int) ($input['sort_order'] ?? 0),
    ]);
    return neximatrix_get_plan($pdo, (int) $pdo->lastInsertId());
}

function neximatrix_admin_update_plan(PDO $pdo, int $planId, array $input): array
{
    $plan = neximatrix_get_plan($pdo, $planId);
    if ($plan === null) {
        neximatrix_http_error('Plan not found.', 404);
    }

    $fields = [];
    $params = [':id' => $planId];
    $allowed = ['name', 'description', 'min_deposit', 'max_deposit', 'daily_return', 'duration_days', 'total_return', 'is_active', 'sort_order'];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $input)) {
            $fields[] = "{$field} = :{$field}";
            $params[":{$field}"] = $input[$field];
        }
    }
    if ($fields === []) {
        neximatrix_http_error('No fields to update.', 422);
    }

    $pdo->prepare('UPDATE investment_plans SET ' . implode(', ', $fields) . ' WHERE id = :id')->execute($params);
    return neximatrix_get_plan($pdo, $planId);
}

function neximatrix_admin_adjust_balance(PDO $pdo, int $userId, float $amount, string $type, string $description): void
{
    if (!in_array($type, ['credit', 'debit'], true)) {
        neximatrix_http_error('Invalid adjustment type.', 422);
    }
    if ($type === 'credit') {
        neximatrix_credit_wallet($pdo, $userId, abs($amount), 'adjustment', null, null, $description);
    } else {
        neximatrix_debit_wallet($pdo, $userId, abs($amount), 'adjustment', null, null, $description);
    }
}
