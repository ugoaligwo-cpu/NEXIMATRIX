<?php
declare(strict_types=1);

function neximatrix_admin_referral_settings_get_all(PDO $pdo): array
{
    $stmt = $pdo->query('SELECT setting_key, setting_value, value_type, updated_at FROM referral_settings ORDER BY setting_key');
    $settings = [];
    foreach ($stmt->fetchAll() as $row) {
        $settings[$row['setting_key']] = [
            'value' => $row['setting_value'],
            'type' => $row['value_type'],
            'updated_at' => $row['updated_at'],
        ];
    }
    return $settings;
}

function neximatrix_admin_referral_settings_update(PDO $pdo, array $settings, int $adminId): array
{
    $allowed = [
        'referral_enabled', 'referral_link_display', 'referral_code_format',
        'referral_attribution', 'referral_privacy', 'referral_terms',
        'referral_email_template', 'referral_demo_points', 'referral_max_levels',
        'referral_commission_rate',
    ];

    $filtered = array_intersect_key($settings, array_flip($allowed));
    if ($filtered === []) {
        neximatrix_http_error('No permitted referral settings were supplied.', 422);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO referral_settings (setting_key, setting_value, value_type, updated_by)
         VALUES (:key, :value, :type, :admin_id)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), value_type = VALUES(value_type), updated_by = VALUES(updated_by), updated_at = UTC_TIMESTAMP()'
    );

    foreach ($filtered as $key => $value) {
        $type = is_numeric($value) && !str_contains((string)$value, '.') ? 'number' : (in_array((string)$value, ['0', '1'], true) ? 'boolean' : 'text');
        $stmt->execute([
            ':key' => $key,
            ':value' => neximatrix_string((string)$value, 0, 5000),
            ':type' => $type,
            ':admin_id' => $adminId,
        ]);
    }

    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.referral_settings.updated', 'referral_settings', null, ['fields' => array_keys($filtered)]);
    return neximatrix_admin_referral_settings_get_all($pdo);
}

function neximatrix_admin_referral_stats(PDO $pdo): array
{
    $stats = [];

    $stats['totalReferrals'] = (int) $pdo->query('SELECT COUNT(*) FROM referrals')->fetchColumn();
    $stats['activeReferrers'] = (int) $pdo->query('SELECT COUNT(DISTINCT referrer_id) FROM referrals')->fetchColumn();
    $stats['totalReferredUsers'] = (int) $pdo->query('SELECT COUNT(DISTINCT referred_id) FROM referrals')->fetchColumn();
    $stats['totalEarned'] = (float) $pdo->query('SELECT COALESCE(SUM(total_earned), 0) FROM referrals')->fetchColumn();

    $stats['topReferrers'] = [];
    $stmt = $pdo->query(
        'SELECT u.username, COUNT(r.id) AS referral_count, SUM(r.total_earned) AS total_earned
         FROM referrals r INNER JOIN users u ON u.id = r.referrer_id
         GROUP BY r.referrer_id ORDER BY referral_count DESC LIMIT 10'
    );
    foreach ($stmt->fetchAll() as $row) {
        $stats['topReferrers'][] = [
            'username' => $row['username'],
            'count' => (int) $row['referral_count'],
            'earned' => (float) $row['total_earned'],
        ];
    }

    $stats['recentReferrals'] = [];
    $stmt = $pdo->query(
        'SELECT r.id, r.referrer_id, r.referred_id, r.created_at,
                u1.username AS referrer_name, u2.username AS referred_name
         FROM referrals r
         INNER JOIN users u1 ON u1.id = r.referrer_id
         INNER JOIN users u2 ON u2.id = r.referred_id
         ORDER BY r.created_at DESC LIMIT 10'
    );
    foreach ($stmt->fetchAll() as $row) {
        $stats['recentReferrals'][] = [
            'id' => (int) $row['id'],
            'referrer' => $row['referrer_name'],
            'referred' => $row['referred_name'],
            'created_at' => $row['created_at'],
        ];
    }

    return $stats;
}

function neximatrix_admin_referral_event_logs(PDO $pdo, int $limit = 50): array
{
    $stmt = $pdo->prepare(
        'SELECT id, referral_id, event_type, details, created_at
         FROM referral_event_logs ORDER BY created_at DESC LIMIT :limit'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}
