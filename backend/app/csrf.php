<?php
declare(strict_types=1);

function neximatrix_csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['csrf_token'];
}

function neximatrix_require_csrf(): void
{
    $header = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    $body = $_POST['_csrf'] ?? '';
    $provided = is_string($header) && $header !== '' ? $header : (is_string($body) ? $body : '');
    $expected = neximatrix_csrf_token();

    if ($provided === '' || !hash_equals($expected, $provided)) {
        // 428 (RFC 6585 "Precondition Required") is used instead of the
        // Laravel-style 419 because Apache rewrites status codes it does not
        // recognise to 500 on the wire, which would hide the real cause.
        neximatrix_http_error('Invalid CSRF token.', 428);
    }
}
