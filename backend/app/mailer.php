<?php
declare(strict_types=1);

/**
 * @deprecated Use NeximatrixMailService directly.
 * This wrapper is kept for backward compatibility.
 */
function neximatrix_send_password_reset(string $email, string $token): bool
{
    $pdo = neximatrix_db();
    $stmt = $pdo->prepare('SELECT full_name FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $fullName = $stmt->fetchColumn();
    $fullName = is_string($fullName) && $fullName !== '' ? $fullName : 'User';

    return NeximatrixMailService::sendPasswordResetEmail($email, $fullName, $token);
}
