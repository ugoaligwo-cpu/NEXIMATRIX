<?php
declare(strict_types=1);

function neximatrix_load_env(string $file): void
{
    if (!is_file($file) || !is_readable($file)) {
        return;
    }

    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value);
        if ($key === '' || getenv($key) !== false) {
            continue;
        }

        if (strlen($value) >= 2) {
            $first = $value[0];
            $last = $value[strlen($value) - 1];
            if (($first === '"' && $last === '"') || ($first === "'" && $last === "'")) {
                $value = substr($value, 1, -1);
            }
        }

        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
    }
}

neximatrix_load_env(dirname(__DIR__) . '/.env');

function neximatrix_env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    return $value === false ? $default : $value;
}

$allowedOrigins = array_values(array_filter(array_map(
    static fn (string $origin): string => rtrim(trim($origin), '/'),
    explode(',', (string) neximatrix_env('APP_ORIGIN', 'http://localhost:3000'))
)));

$neximatrixConfig = [
    'allowed_origins' => $allowedOrigins,
    'session_name' => (string) neximatrix_env('SESSION_NAME', 'neximatrix_session'),
    'session_lifetime' => max(300, (int) neximatrix_env('SESSION_LIFETIME', '604800')),
    'session_secure' => filter_var(neximatrix_env('SESSION_SECURE', 'false'), FILTER_VALIDATE_BOOLEAN),
    'app_url' => rtrim((string) neximatrix_env('APP_URL', 'http://localhost:3000'), '/'),
    'mail_enabled' => filter_var(neximatrix_env('MAIL_ENABLED', 'false'), FILTER_VALIDATE_BOOLEAN),
    'mail_from' => (string) neximatrix_env('MAIL_FROM', 'no-reply@Neximatrix.local'),
    'db' => [
        'host' => (string) neximatrix_env('DB_HOST', '127.0.0.1'),
        'port' => (int) neximatrix_env('DB_PORT', '3306'),
        'name' => (string) neximatrix_env('DB_NAME', 'Neximatrix'),
        'user' => (string) neximatrix_env('DB_USER', 'root'),
        'pass' => (string) neximatrix_env('DB_PASS', ''),
    ],
];

return $neximatrixConfig;
