<?php
declare(strict_types=1);

final class NeximatrixHttpException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 400,
        public readonly array $errors = []
    ) {
        parent::__construct($message);
    }
}

function neximatrix_http_error(string $message, int $status = 400, array $errors = []): void
{
    throw new NeximatrixHttpException($message, $status, $errors);
}

function neximatrix_json(mixed $payload, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function neximatrix_success(array $data = [], int $status = 200): never
{
    neximatrix_json(['ok' => true, 'data' => $data], $status);
}

function neximatrix_error(string $message, int $status = 400, array $errors = []): never
{
    neximatrix_json([
        'ok' => false,
        'error' => ['message' => $message, 'fields' => (object) $errors],
    ], $status);
}

function neximatrix_method(string ...$allowed): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (!in_array($method, $allowed, true)) {
        header('Allow: ' . implode(', ', $allowed));
        neximatrix_http_error('Method not allowed.', 405);
    }
}

function neximatrix_input(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return $_POST;
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        neximatrix_http_error('Request body must be valid JSON.', 400);
    }

    return $decoded;
}

function neximatrix_string(mixed $value, int $min = 1, int $max = 255): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = trim($value);
    if (function_exists('mb_strlen')) {
        $length = mb_strlen($value);
    } else {
        $length = strlen($value);
    }
    return $length >= $min && $length <= $max ? $value : '';
}

function neximatrix_email(mixed $value): string
{
    if (!is_string($value)) return '';
    $email = strtolower(trim($value));
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '';
}

function neximatrix_username(mixed $value): string
{
    if (!is_string($value)) return '';
    $username = trim($value);
    return preg_match('/^[a-zA-Z0-9_]{3,50}$/', $username) ? $username : '';
}

function neximatrix_password(mixed $value): string
{
    if (!is_string($value)) return '';
    $password = $value;
    if (strlen($password) < 8 || strlen($password) > 72) {
        return '';
    }
    if (!preg_match('/[a-zA-Z]/', $password) || !preg_match('/\d/', $password)) {
        return '';
    }
    return $password;
}

function neximatrix_client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

function neximatrix_user_agent(): string
{
    return substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
}

function neximatrix_query_string(string $key): string
{
    $value = $_GET[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

function neximatrix_query_int(string $key, int $default = 0): int
{
    $value = $_GET[$key] ?? $default;
    return (is_int($value) || (is_string($value) && ctype_digit($value))) ? (int) $value : $default;
}

function neximatrix_page_params(): array
{
    $page = max(1, neximatrix_query_int('page', 1));
    $limit = min(100, max(1, neximatrix_query_int('limit', 20)));
    return [$page, $limit, ($page - 1) * $limit];
}

function neximatrix_date(?string $value): ?string
{
    if ($value === null || $value === '') {
        return null;
    }
    return substr($value, 0, 19);
}
