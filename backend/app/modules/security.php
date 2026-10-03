<?php
declare(strict_types=1);

function neximatrix_admin_email_logs(PDO $pdo, int $limit = 50): array
{
    $stmt = $pdo->prepare(
        'SELECT id, recipient, subject, status, error, notification_type, sent_at
         FROM email_logs
         ORDER BY sent_at DESC LIMIT :limit'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_admin_security_login_history(PDO $pdo, ?int $userId = null, int $limit = 20): array
{
    return neximatrix_admin_login_history($pdo, $userId, $limit);
}

function neximatrix_admin_security_failed_logins(PDO $pdo, int $hours = 24): array
{
    $stmt = $pdo->prepare(
        'SELECT identifier, COUNT(*) AS attempts, MAX(created_at) AS last_attempt
         FROM login_attempts
         WHERE success = 0 AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL :hours HOUR)
         GROUP BY identifier ORDER BY attempts DESC'
    );
    $stmt->bindValue(':hours', $hours, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_check_rate_limit(PDO $pdo, string $identifier): array
{
    $maxAttempts = (int) neximatrix_get_setting($pdo, 'max_login_attempts', '5');
    $lockoutMinutes = (int) neximatrix_get_setting($pdo, 'lockout_duration_minutes', '30');

    $stmt = $pdo->prepare(
        'SELECT COUNT(*) AS attempts, MAX(created_at) AS last_attempt
         FROM login_attempts
         WHERE identifier = :identifier AND success = 0
         AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL :minutes MINUTE)'
    );
    $stmt->execute([':identifier' => $identifier, ':minutes' => $lockoutMinutes]);
    $result = $stmt->fetch();

    $attempts = (int) ($result['attempts'] ?? 0);
    $lastAttempt = $result['last_attempt'] ?? null;

    $locked = $attempts >= $maxAttempts;
    $remaining = max(0, $maxAttempts - $attempts);

    return [
        'locked' => $locked,
        'attempts' => $attempts,
        'max_attempts' => $maxAttempts,
        'remaining' => $remaining,
        'last_attempt' => $lastAttempt,
    ];
}

function neximatrix_admin_system_info(PDO $pdo): array
{
    $info = [];
    $info['phpVersion'] = PHP_VERSION;
    $info['phpSapi'] = PHP_SAPI;
    $info['serverSoftware'] = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';
    $info['databaseVersion'] = $pdo->query('SELECT VERSION()')->fetchColumn();
    $info['databaseTables'] = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchColumn();
    $info['storageWritable'] = is_writable(dirname(__DIR__) . '/storage');
    $info['hyipImportsWritable'] = is_writable(dirname(__DIR__) . '/storage/hyip-imports');
    $info['timezone'] = date_default_timezone_get();
    $info['maxExecutionTime'] = ini_get('max_execution_time');
    $info['memoryLimit'] = ini_get('memory_limit');
    $info['uploadMaxFilesize'] = ini_get('upload_max_filesize');
    $info['postMaxSize'] = ini_get('post_max_size');

    $extensions = ['pdo_mysql', 'mysqli', 'mbstring', 'openssl', 'json', 'curl', 'zip', 'session', 'ionCube Loader'];
    $info['extensions'] = [];
    foreach ($extensions as $ext) {
        $info['extensions'][$ext] = extension_loaded($ext);
    }

    return $info;
}

function neximatrix_admin_system_health_check(PDO $pdo): array
{
    $checks = [];

    $checks['database'] = ['ok' => true, 'label' => 'Database Connection'];
    $checks['storage'] = ['ok' => is_writable(dirname(__DIR__) . '/storage'), 'label' => 'Storage Writable'];
    $checks['hyip_imports'] = ['ok' => is_writable(dirname(__DIR__) . '/storage/hyip-imports'), 'label' => 'HYIP Imports Writable'];

    $config = neximatrix_config();
    $checks['mail'] = ['ok' => $config['mail_enabled'], 'label' => 'Mail Enabled', 'warn' => !$config['mail_enabled']];

    $settings = neximatrix_site_settings($pdo);
    $checks['maintenance'] = ['ok' => neximatrix_get_setting($pdo, 'maintenance_enabled') !== '1', 'label' => 'Maintenance Mode Off', 'warn' => neximatrix_get_setting($pdo, 'maintenance_enabled') === '1'];

    return $checks;
}

function neximatrix_admin_system_logs_list(PDO $pdo, string $level = '', string $channel = '', int $limit = 50): array
{
    $where = '1 = 1';
    $params = [];
    if ($level !== '') {
        $where .= ' AND level = :level';
        $params[':level'] = $level;
    }
    if ($channel !== '') {
        $where .= ' AND channel = :channel';
        $params[':channel'] = $channel;
    }
    $stmt = $pdo->prepare("SELECT id, level, channel, message, context, created_at FROM system_logs WHERE {$where} ORDER BY created_at DESC LIMIT :limit");
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_admin_system_log_add(PDO $pdo, string $level, string $channel, string $message, array $context = []): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO system_logs (level, channel, message, context) VALUES (:level, :channel, :message, :context)'
    );
    $stmt->execute([
        ':level' => $level,
        ':channel' => $channel,
        ':message' => $message,
        ':context' => $context === [] ? null : json_encode($context, JSON_UNESCAPED_UNICODE),
    ]);
}

function neximatrix_admin_backup_create(PDO $pdo, int $adminId): array
{
    $filename = 'backup_' . gmdate('Y-m-d_His') . '.sql';
    $path = dirname(__DIR__) . '/storage/backups/' . $filename;

    if (!is_dir(dirname($path))) {
        mkdir(dirname($path), 0700, true);
    }

    $tables = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchAll(PDO::FETCH_COLUMN);
    $output = "-- Neximatrix.com Backup\n-- Generated: " . gmdate('Y-m-d H:i:s') . "\n\n";

    foreach ($tables as $table) {
        $output .= "DROP TABLE IF EXISTS `{$table}`;\n";
        $create = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_ASSOC);
        $output .= $create['Create Table'] . ";\n\n";

        $rows = $pdo->query("SELECT * FROM `{$table}`")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $row) {
            $cols = array_keys($row);
            $vals = array_map(function ($v) use ($pdo) {
                return $v === null ? 'NULL' : $pdo->quote($v);
            }, array_values($row));
            $output .= "INSERT INTO `{$table}` (`" . implode('`,`', $cols) . "`) VALUES (" . implode(',', $vals) . ");\n";
        }
        $output .= "\n";
    }

    file_put_contents($path, $output, LOCK_EX);
    $size = filesize($path);

    $stmt = $pdo->prepare('INSERT INTO backups (filename, size, status, created_by, completed_at) VALUES (:filename, :size, :status, :created_by, UTC_TIMESTAMP())');
    $stmt->execute([':filename' => $filename, ':size' => $size, ':status' => 'completed', ':created_by' => $adminId]);

    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.backup.created', 'backup', null, ['filename' => $filename, 'size' => $size]);

    return ['filename' => $filename, 'size' => $size, 'path' => 'storage/backups/' . $filename];
}

function neximatrix_admin_backup_list(PDO $pdo): array
{
    return $pdo->query('SELECT id, filename, size, status, created_at FROM backups ORDER BY created_at DESC')->fetchAll();
}

function neximatrix_admin_scheduled_tasks_list(PDO $pdo): array
{
    return $pdo->query('SELECT id, task_name, task_description, schedule, last_run_at, next_run_at, status, is_active, created_at, updated_at FROM scheduled_tasks ORDER BY task_name')->fetchAll();
}

function neximatrix_admin_diagnostics(PDO $pdo): array
{
    $diag = [];

    $diag['phpVersion'] = PHP_VERSION;
    $diag['phpSapi'] = PHP_SAPI;
    $diag['serverSoftware'] = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';
    $diag['databaseVersion'] = $pdo->query('SELECT VERSION()')->fetchColumn();
    $diag['databaseTables'] = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchColumn();

    $extensions = ['pdo_mysql', 'mysqli', 'mbstring', 'openssl', 'json', 'curl', 'zip', 'session', 'ionCube Loader'];
    $diag['extensions'] = [];
    foreach ($extensions as $ext) {
        $diag['extensions'][$ext] = extension_loaded($ext);
    }

    $diag['storageWritable'] = is_writable(dirname(__DIR__) . '/storage');
    $diag['hyipImportsWritable'] = is_writable(dirname(__DIR__) . '/storage/hyip-imports');
    $diag['backupsWritable'] = is_writable(dirname(__DIR__) . '/storage/backups');
    $diag['logsWritable'] = is_writable(dirname(__DIR__) . '/storage/logs');

    $diag['timezone'] = date_default_timezone_get();
    $diag['maxExecutionTime'] = ini_get('max_execution_time');
    $diag['memoryLimit'] = ini_get('memory_limit');
    $diag['uploadMaxFilesize'] = ini_get('upload_max_filesize');
    $diag['postMaxSize'] = ini_get('post_max_size');

    $diag['maintenanceMode'] = neximatrix_get_setting($pdo, 'maintenance_enabled') === '1';
    $diag['registrationEnabled'] = neximatrix_get_setting($pdo, 'registration_enabled') === '1';
    $diag['mailEnabled'] = neximatrix_config()['mail_enabled'];

    $diag['userCount'] = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $diag['activeTickets'] = (int) $pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status IN ('open', 'in_progress', 'waiting_for_user')")->fetchColumn();
    $diag['pendingDeposits'] = (int) $pdo->query("SELECT COUNT(*) FROM deposits WHERE status = 'pending'")->fetchColumn();
    $diag['pendingWithdrawals'] = (int) $pdo->query("SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'")->fetchColumn();

    $diag['errorLogSize'] = is_file(dirname(__DIR__) . '/storage/logs/error.log') ? filesize(dirname(__DIR__) . '/storage/logs/error.log') : 0;
    $diag['lastBackup'] = null;
    $backup = $pdo->query("SELECT filename, size, created_at FROM backups WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1")->fetch();
    if ($backup !== false) {
        $diag['lastBackup'] = ['filename' => $backup['filename'], 'size' => (int) $backup['size'], 'created_at' => $backup['created_at']];
    }

    return $diag;
}

function neximatrix_admin_log_viewer(PDO $pdo, string $level = '', string $channel = '', int $limit = 50): array
{
    return neximatrix_admin_system_logs_list($pdo, $level, $channel, $limit);
}

function neximatrix_admin_redact_logs(array $logs): array
{
    $redacted = [];
    foreach ($logs as $log) {
        $message = (string) $log['message'];
        $patterns = [
            '/password\s*[=:]\s*\S+/i' => 'password: [REDACTED]',
            '/token\s*[=:]\s*\S+/i' => 'token: [REDACTED]',
            '/secret\s*[=:]\s*\S+/i' => 'secret: [REDACTED]',
            '/hash\s*[=:]\s*\S+/i' => 'hash: [REDACTED]',
            '/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/' => '[REDACTED CARD]',
            '/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/' => '[REDACTED EMAIL]',
        ];
        foreach ($patterns as $pattern => $replacement) {
            $message = preg_replace($pattern, $replacement, $message) ?? $message;
        }
        $log['message'] = $message;
        $redacted[] = $log;
    }
    return $redacted;
}
