<?php
declare(strict_types=1);

function neximatrix_admin_overview_stats(PDO $pdo): array
{
    $stats = [];

    // User counts
    $stats['totalUsers'] = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $stats['activeUsers'] = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE status = 'active'")->fetchColumn();
    $stats['suspendedUsers'] = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE status IN ('suspended', 'disabled')")->fetchColumn();
    $stats['pendingUsers'] = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE status = 'pending'")->fetchColumn();
    $stats['newToday'] = (int) $pdo->query('SELECT COUNT(*) FROM users WHERE created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)')->fetchColumn();
    $stats['newThisWeek'] = (int) $pdo->query('SELECT COUNT(*) FROM users WHERE created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)')->fetchColumn();

    // Support counts
    $stats['openTickets'] = (int) $pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status = 'open'")->fetchColumn();
    $stats['inProgressTickets'] = (int) $pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status = 'in_progress'")->fetchColumn();
    $stats['waitingTickets'] = (int) $pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status = 'waiting_for_user'")->fetchColumn();
    $stats['resolvedTickets'] = (int) $pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status = 'resolved'")->fetchColumn();
    $stats['closedTickets'] = (int) $pdo->query("SELECT COUNT(*) FROM support_tickets WHERE status = 'closed'")->fetchColumn();

    // Financial (demo)
    $stats['totalDeposits'] = (float) $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE status = 'approved'")->fetchColumn();
    $stats['pendingDeposits'] = (int) $pdo->query("SELECT COUNT(*) FROM deposits WHERE status = 'pending'")->fetchColumn();
    $stats['totalWithdrawals'] = (float) $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE status IN ('approved', 'paid')")->fetchColumn();
    $stats['pendingWithdrawals'] = (int) $pdo->query("SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'")->fetchColumn();
    $stats['totalInvested'] = (float) $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM investments WHERE status = 'active'")->fetchColumn();
    $stats['totalProfitPaid'] = (float) $pdo->query("SELECT COALESCE(SUM(profit_earned), 0) FROM investments")->fetchColumn();

    // Content
    $stats['publishedPages'] = (int) $pdo->query("SELECT COUNT(*) FROM content_pages WHERE status = 'published'")->fetchColumn();
    $stats['draftPages'] = (int) $pdo->query("SELECT COUNT(*) FROM content_pages WHERE status = 'draft'")->fetchColumn();
    $stats['publishedNews'] = (int) $pdo->query("SELECT COUNT(*) FROM news_articles WHERE status = 'published'")->fetchColumn();
    $stats['activeFaqs'] = (int) $pdo->query("SELECT COUNT(*) FROM faqs WHERE is_active = 1")->fetchColumn();

    // Communication
    $stats['newsletterSubscribers'] = (int) $pdo->query("SELECT COUNT(*) FROM newsletter_subscriptions WHERE is_subscribed = 1")->fetchColumn();
    $stats['unreadContactSubmissions'] = (int) $pdo->query("SELECT COUNT(*) FROM contact_submissions WHERE is_read = 0")->fetchColumn();

    // Security
    $stats['failedLogins24h'] = (int) $pdo->query("SELECT COUNT(*) FROM login_attempts WHERE success = 0 AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)")->fetchColumn();
    $stats['securityEvents24h'] = (int) $pdo->query("SELECT COUNT(*) FROM security_events WHERE created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)")->fetchColumn();

    // System
    $stats['phpVersion'] = PHP_VERSION;
    $stats['dbConnected'] = true;
    $stats['maintenanceMode'] = false;
    $stats['storageWritable'] = is_writable(dirname(__DIR__) . '/storage');

    return $stats;
}

function neximatrix_admin_recent_activity(PDO $pdo, int $limit = 15): array
{
    $stmt = $pdo->query(
        'SELECT a.id, a.action, a.entity_type, a.entity_id, a.created_at,
                u.username, u.full_name
         FROM activity_logs a
         LEFT JOIN users u ON u.id = a.actor_user_id
         ORDER BY a.created_at DESC
         LIMIT ' . (int) $limit
    );
    return $stmt->fetchAll();
}

function neximatrix_admin_recent_users(PDO $pdo, int $limit = 5): array
{
    $stmt = $pdo->prepare(
        'SELECT id, username, email, status, created_at
         FROM users ORDER BY created_at DESC LIMIT :limit'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_admin_recent_tickets(PDO $pdo, int $limit = 5): array
{
    $stmt = $pdo->prepare(
        'SELECT t.id, t.subject, t.status, t.priority, t.created_at,
                u.username, u.full_name
         FROM support_tickets t
         INNER JOIN users u ON u.id = t.user_id
         ORDER BY t.created_at DESC
         LIMIT :limit'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_admin_system_health(PDO $pdo): array
{
    $health = [];

    $health['phpVersion'] = PHP_VERSION;
    $health['phpMajorVersion'] = PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION;

    $extensions = ['pdo_mysql', 'mysqli', 'mbstring', 'openssl', 'json', 'curl', 'zip', 'session'];
    $health['extensions'] = [];
    foreach ($extensions as $ext) {
        $health['extensions'][$ext] = extension_loaded($ext);
    }

    $health['dbConnected'] = true;
    $health['dbTables'] = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()")->fetchColumn();

    $health['storageWritable'] = is_writable(dirname(__DIR__) . '/storage');
    $health['storageHyipImportsWritable'] = is_writable(dirname(__DIR__) . '/storage/hyip-imports');

    $config = neximatrix_config();
    $health['mailEnabled'] = $config['mail_enabled'];
    $health['sessionLifetime'] = $config['session_lifetime'];
    $health['maintenanceMode'] = neximatrix_get_setting($pdo, 'maintenance_enabled') === '1';

    $settings = neximatrix_site_settings($pdo);
    $health['siteName'] = neximatrix_get_setting($pdo, 'site_name');

    return $health;
}

function neximatrix_get_setting(PDO $pdo, string $key): ?string
{
    $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value === false ? null : $value;
}

function neximatrix_get_all_settings(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT setting_key, setting_value, value_type, is_public FROM site_settings ORDER BY setting_key');
    $settings = [];
    foreach ($stmt->fetchAll() as $row) {
        $settings[$row['setting_key']] = [
            'value' => $row['setting_value'],
            'type' => $row['value_type'],
            'public' => (bool) $row['is_public'],
        ];
    }
    return $settings;
}

function neximatrix_update_settings(PDO $pdo, array $settings, int $adminId): array
{
    $allowed = [
        'site_name', 'site_tagline', 'site_description',
        'meta_title', 'meta_description',
        'timezone', 'date_format', 'time_format',
        'registration_enabled', 'registration_email_verification',
        'maintenance_enabled', 'maintenance_message',
        'session_timeout_minutes', 'max_login_attempts', 'lockout_duration_minutes',
        'password_min_length', 'password_require_letter', 'password_require_number',
        'facebook_url', 'twitter_url', 'instagram_url', 'linkedin_url', 'youtube_url',
        'footer_copyright', 'footer_text',
        'support_email', 'support_phone', 'announcement', 'about_text',
    ];

    $filtered = array_intersect_key($settings, array_flip($allowed));
    if ($filtered === []) {
        neximatrix_http_error('No permitted settings were supplied.', 422);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO site_settings (setting_key, setting_value, value_type, is_public, updated_by)
         VALUES (:key, :value, :type, :public, :admin_id)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by), updated_at = UTC_TIMESTAMP()'
    );

    $publicKeys = ['site_name', 'site_tagline', 'site_description', 'meta_title', 'meta_description',
                   'facebook_url', 'twitter_url', 'instagram_url', 'linkedin_url', 'youtube_url',
                   'footer_copyright', 'footer_text', 'support_email', 'support_phone', 'announcement', 'about_text'];

    foreach ($filtered as $key => $value) {
        $type = is_numeric($value) && !str_contains($value, '.') ? 'number' : (in_array($value, ['0', '1'], true) ? 'boolean' : 'text');
        $stmt->execute([
            ':key' => $key,
            ':value' => neximatrix_string($value, 0, 5000),
            ':type' => $type,
            ':public' => in_array($key, $publicKeys, true) ? 1 : 0,
            ':admin_id' => $adminId,
        ]);
    }

    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.settings.updated', 'site_settings', null, ['fields' => array_keys($filtered)]);
    return neximatrix_get_all_settings($pdo);
}
