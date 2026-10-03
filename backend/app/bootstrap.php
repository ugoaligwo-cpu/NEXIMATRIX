<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/activity.php';
require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/services/MailService.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/repositories.php';
require_once __DIR__ . '/finance.php';
require_once __DIR__ . '/hyip.php';
require_once __DIR__ . '/modules/rbac.php';
require_once __DIR__ . '/modules/dashboard.php';
require_once __DIR__ . '/modules/users.php';
require_once __DIR__ . '/modules/support.php';
require_once __DIR__ . '/modules/content.php';
require_once __DIR__ . '/modules/security.php';
require_once __DIR__ . '/modules/referral.php';
require_once __DIR__ . '/modules/payment-methods.php';
require_once __DIR__ . '/modules/bonuses.php';
require_once __DIR__ . '/modules/content-expansion.php';
require_once __DIR__ . '/modules/crypto.php';

date_default_timezone_set('UTC');
if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding('UTF-8');
}

$neximatrixConfig = neximatrix_config();
$neximatrixOrigin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
if ($neximatrixOrigin !== '' && in_array(rtrim($neximatrixOrigin, '/'), $neximatrixConfig['allowed_origins'], true)) {
    header('Access-Control-Allow-Origin: ' . rtrim($neximatrixOrigin, '/'));
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
header('Cache-Control: no-store');

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name($neximatrixConfig['session_name']);
    session_set_cookie_params([
        'lifetime' => $neximatrixConfig['session_lifetime'],
        'path' => '/',
        'secure' => $neximatrixConfig['session_secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}
