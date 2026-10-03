<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once dirname(__DIR__, 2) . '/inc/libs/class.phpmailer.php';
require_once dirname(__DIR__, 2) . '/inc/libs/class.smtp.php';

final class NeximatrixMailService
{
    private const RESET_LINK_TTL = '1 hour';
    private const LOGIN_LINK_TTL = '30 minutes';

    /**
     * Send an email and log the outcome.
     *
     * @return bool True if the mail provider accepted the message.
     */
    private static function send(
        string $recipient,
        string $subject,
        string $htmlBody,
        string $plainBody,
        string $notificationType
    ): bool {
        $config = neximatrix_config();
        $pdo = neximatrix_db();

        if (!$config['mail_enabled']) {
            self::log($pdo, $recipient, $subject, 'queued', 'Mail is disabled.', $notificationType);
            error_log("Neximatrix mail is disabled. Queued '{$notificationType}' notification for recipient.");
            return false;
        }

        if ($config['mail_host'] === '' || $config['mail_username'] === '') {
            self::log($pdo, $recipient, $subject, 'failed', 'SMTP is not configured.', $notificationType);
            error_log('Neximatrix SMTP is not configured.');
            return false;
        }

        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host       = $config['mail_host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $config['mail_username'];
            $mail->Password   = self::smtpPassword();
            $mail->SMTPSecure = $config['mail_encryption'];
            $mail->Port       = (int) $config['mail_port'];
            $mail->Timeout    = 20;

            $siteName = self::siteName();
            $mail->setFrom($config['mail_from'], $siteName);
            $mail->addAddress($recipient);

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $htmlBody;
            $mail->AltBody = $plainBody;

            $sent = $mail->send();
            self::log(
                $pdo,
                $recipient,
                $subject,
                $sent ? 'sent' : 'failed',
                $sent ? null : 'The mail provider did not accept the message.',
                $notificationType
            );

            return $sent;
        } catch (Exception $e) {
            $reason = self::sanitizeError($e->getMessage());
            self::log($pdo, $recipient, $subject, 'failed', $reason, $notificationType);
            error_log('Neximatrix email failed: ' . $reason);
            return false;
        }
    }

    private static function smtpPassword(): string
    {
        $config = neximatrix_config();
        $password = $config['mail_password'] ?? '';

        // MAIL_PASSWORD may be supplied as a path to a credentials file.
        if ($password !== '' && str_starts_with($password, 'file:') && is_file(substr($password, 5))) {
            $contents = file_get_contents(substr($password, 5));
            if ($contents !== false) {
                $password = trim($contents);
            }
        }

        return $password;
    }

    private static function siteName(): string
    {
        try {
            $pdo = neximatrix_db();
            $stmt = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'site_name' LIMIT 1");
            $value = $stmt->fetchColumn();
            if (is_string($value) && $value !== '') {
                return $value;
            }
        } catch (Throwable) {
            // Database unavailable; fall back to default.
        }

        return 'Neximatrix.com';
    }

    private static function supportEmail(): string
    {
        try {
            $pdo = neximatrix_db();
            $stmt = $pdo->query("SELECT setting_value FROM site_settings WHERE setting_key = 'support_email' LIMIT 1");
            $value = $stmt->fetchColumn();
            if (is_string($value) && $value !== '' && filter_var($value, FILTER_VALIDATE_EMAIL)) {
                return $value;
            }
        } catch (Throwable) {
            // Database unavailable; fall back to default.
        }

        return 'support@Neximatrix.local';
    }

    private static function sanitizeError(string $message): string
    {
        // Never expose SMTP credentials or server paths in logs.
        $message = preg_replace('/(AUTH|password|Password)\s+[A-Za-z0-9+\/=]+/i', '$1 [REDACTED]', $message) ?? $message;
        $message = preg_replace('/[\/\\\\][^\s]+Credentials[\/\\\\][^\s]+/', '[credentials-path]', $message) ?? $message;
        return substr($message, 0, 500);
    }

    private static function log(
        PDO $pdo,
        string $recipient,
        string $subject,
        string $status,
        ?string $error,
        string $notificationType
    ): void {
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO email_logs (recipient, subject, status, error, notification_type)
                 VALUES (:recipient, :subject, :status, :error, :notification_type)'
            );
            $stmt->execute([
                ':recipient' => $recipient,
                ':subject' => substr($subject, 0, 255),
                ':status' => $status,
                ':error' => $error === null ? null : substr($error, 0, 1000),
                ':notification_type' => $notificationType,
            ]);
        } catch (Throwable $e) {
            error_log('Neximatrix email log failed: ' . $e->getMessage());
        }
    }

    private static function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }

    private static function layout(string $title, string $bodyHtml, string $plainBody): array
    {
        $siteName = self::siteName();
        $supportEmail = self::supportEmail();

        $html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<title>' . self::e($title) . '</title>'
            . '<style>'
            . 'body{margin:0;padding:0;background:#f4f6fb;font-family:Avenir,Segoe UI,Arial,sans-serif;color:#1a2233;}'
            . '.wrapper{max-width:600px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08);}'
            . '.header{padding:28px 32px;background:linear-gradient(135deg,#4f46e5,#7c3aed);}'
            . '.header h1{margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-.02em;}'
            . '.content{padding:32px;font-size:15px;line-height:1.7;}'
            . '.button{display:inline-block;margin:20px 0;padding:12px 28px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;}'
            . '.footer{padding:20px 32px;background:#f8fafc;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;}'
            . '.muted{color:#64748b;font-size:13px;}'
            . '</style></head><body>'
            . '<div class="wrapper">'
            . '<div class="header"><h1>' . self::e($siteName) . '</h1></div>'
            . '<div class="content">' . $bodyHtml . '</div>'
            . '<div class="footer">'
            . '<p class="muted">This is an automated notification from ' . self::e($siteName) . '. '
            . 'Contact us at <a href="mailto:' . self::e($supportEmail) . '">' . self::e($supportEmail) . '</a> if you have questions.</p>'
            . '<p class="muted">Please do not reply to this email address.</p>'
            . '</div></div></body></html>';

        $plain = $plainBody . "\n\n—\n"
            . $siteName . " automated notification\n"
            . "Support: " . $supportEmail;

        return [$html, $plain];
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Send a notification to all admin users.
     */
    public static function notifyAdmins(string $type, string $subject, string $message): void
    {
        try {
            $pdo = neximatrix_db();
            $stmt = $pdo->query(
                "SELECT u.email FROM users u
                 INNER JOIN user_roles ur ON ur.user_id = u.id
                 INNER JOIN roles r ON r.id = ur.role_id
                 WHERE r.name IN ('admin', 'super_admin') AND u.status = 'active'"
            );
            $admins = $stmt->fetchAll(PDO::FETCH_COLUMN);
            foreach ($admins as $adminEmail) {
                if (is_string($adminEmail) && $adminEmail !== '') {
                    self::sendAdminNotificationEmail($adminEmail, $subject, $message);
                }
            }
        } catch (Throwable $e) {
            error_log('Neximatrix admin notification failed: ' . $e->getMessage());
        }
    }

    public static function sendWelcomeEmail(string $email, string $fullName): bool
    {
        $siteName = self::siteName();
        $loginUrl = neximatrix_config()['app_url'] . '/login';
        $supportEmail = self::supportEmail();

        $subject = "Welcome to {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Welcome to <strong>' . self::e($siteName) . '</strong>! Your account has been created successfully.</p>'
            . '<p>You can now sign in to your account using the button below:</p>'
            . '<p><a class="button" href="' . self::e($loginUrl) . '">Sign in to your account</a></p>'
            . '<p class="muted">If you have any questions, contact us at <a href="mailto:' . self::e($supportEmail) . '">' . self::e($supportEmail) . '</a>.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Welcome to {$siteName}! Your account has been created successfully.\n\n"
            . "Sign in at: {$loginUrl}\n\n"
            . "If you have any questions, contact us at: {$supportEmail}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'welcome');
    }

    public static function sendAccountVerificationEmail(string $email, string $fullName, string $token): bool
    {
        $siteName = self::siteName();
        $verifyUrl = neximatrix_config()['app_url'] . '/verify-email?token=' . rawurlencode($token);

        $subject = "Verify your {$siteName} email address";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Please verify your email address by clicking the button below:</p>'
            . '<p><a class="button" href="' . self::e($verifyUrl) . '">Verify email address</a></p>'
            . '<p class="muted">This link expires in ' . self::RESET_LINK_TTL . '. If you did not create an account, you can ignore this message.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Please verify your email address by opening this link:\n{$verifyUrl}\n\n"
            . "This link expires in " . self::RESET_LINK_TTL . ". If you did not create an account, you can ignore this message.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'account_verification');
    }

    public static function sendPasswordResetEmail(string $email, string $fullName, string $token): bool
    {
        $siteName = self::siteName();
        $resetUrl = neximatrix_config()['app_url'] . '/reset-password?token=' . rawurlencode($token);

        $subject = "Reset your {$siteName} password";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>A password reset was requested for your account.</p>'
            . '<p><a class="button" href="' . self::e($resetUrl) . '">Reset password</a></p>'
            . '<p class="muted">This link expires in ' . self::RESET_LINK_TTL . '. If you did not request this, you can ignore this message.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "A password reset was requested for your account.\n\n"
            . "Use this link within " . self::RESET_LINK_TTL . " to choose a new password:\n{$resetUrl}\n\n"
            . "If you did not request this, you can ignore this message.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'password_reset');
    }

    public static function sendPasswordChangedEmail(string $email, string $fullName): bool
    {
        $siteName = self::siteName();
        $loginUrl = neximatrix_config()['app_url'] . '/login';
        $supportEmail = self::supportEmail();

        $subject = "Your {$siteName} password was changed";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your account password was changed successfully.</p>'
            . '<p>If you made this change, no action is needed. If you did not change your password, '
            . 'please <a href="' . self::e($loginUrl) . '">sign in</a> and update it immediately, '
            . 'or contact us at <a href="mailto:' . self::e($supportEmail) . '">' . self::e($supportEmail) . '</a>.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your account password was changed successfully.\n\n"
            . "If you made this change, no action is needed. If you did not change your password, "
            . "please sign in at {$loginUrl} and update it immediately, or contact us at: {$supportEmail}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'password_changed');
    }

    public static function sendLoginNotificationEmail(string $email, string $fullName): bool
    {
        $siteName = self::siteName();
        $loginUrl = neximatrix_config()['app_url'] . '/login';
        $supportEmail = self::supportEmail();

        $subject = "New sign-in to your {$siteName} account";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>A successful sign-in to your account was detected.</p>'
            . '<p class="muted">Time: ' . self::e(gmdate('Y-m-d H:i:s')) . ' UTC</p>'
            . '<p>If this was you, no action is needed. If you did not sign in, '
            . 'please <a href="' . self::e($loginUrl) . '">sign in</a> and change your password immediately, '
            . 'or contact us at <a href="mailto:' . self::e($supportEmail) . '">' . self::e($supportEmail) . '</a>.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "A successful sign-in to your account was detected.\n\n"
            . "Time: " . gmdate('Y-m-d H:i:s') . " UTC\n\n"
            . "If this was you, no action is needed. If you did not sign in, "
            . "please sign in at {$loginUrl} and change your password immediately, or contact us at: {$supportEmail}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'login_notification');
    }

    public static function sendAccountStatusEmail(string $email, string $fullName, string $status): bool
    {
        $siteName = self::siteName();
        $supportEmail = self::supportEmail();

        $statusLabel = ucfirst($status);

        $subject = "Your {$siteName} account status changed";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your account status has been changed to: <strong>' . self::e($statusLabel) . '</strong>.</p>'
            . '<p>If you have any questions, contact us at <a href="mailto:' . self::e($supportEmail) . '">' . self::e($supportEmail) . '</a>.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your account status has been changed to: {$statusLabel}.\n\n"
            . "If you have any questions, contact us at: {$supportEmail}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'account_status');
    }

    public static function sendAdminNotificationEmail(string $adminEmail, string $subject, string $message): bool
    {
        $siteName = self::siteName();
        $supportEmail = self::supportEmail();

        $subject = "[{$siteName}] " . $subject;

        $bodyHtml = '<p>Hello,</p>'
            . '<p>' . nl2br(self::e($message)) . '</p>'
            . '<p class="muted">This is an automated admin notification from ' . self::e($siteName) . '.</p>';

        $plainBody = "Hello,\n\n" . $message . "\n\n"
            . "This is an automated admin notification from {$siteName}.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($adminEmail, $subject, $html, $plain, 'admin_notification');
    }

    // ─── Deposit Notifications ────────────────────────────────────────────────

    public static function sendDepositUserNotification(string $email, string $fullName, float $amount, string $method, string $status, string $requestReference = '', string $planName = '', float $depositFee = 0, float $creditAmount = 0, string $network = ''): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);
        $feeFormatted = $currency . number_format($depositFee, 2);
        $creditFormatted = $currency . number_format($creditAmount, 2);

        $subject = "Deposit request submitted - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your deposit request has been submitted successfully and is awaiting administrative review.</p>'
            . '<p><strong>Request Reference:</strong> ' . self::e($requestReference) . '<br>'
            . '<strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '<br>'
            . '<strong>Status:</strong> ' . self::e(ucfirst($status)) . '</p>';
        if ($planName !== '') {
            $bodyHtml .= '<p><strong>Plan:</strong> ' . self::e($planName) . '<br>';
        }
        if ($network !== '') {
            $bodyHtml .= '<strong>Network:</strong> ' . self::e($network) . '<br>';
        }
        if ($depositFee > 0) {
            $bodyHtml .= '<strong>Deposit Fee:</strong> ' . self::e($feeFormatted) . '<br>'
                . '<strong>Credit Amount:</strong> ' . self::e($creditFormatted) . '<br>';
        }
        $bodyHtml .= '</p>';
        $bodyHtml .= '<p class="muted">This is a simulated demo deposit. No real cryptocurrency payment was processed.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your deposit request has been submitted successfully and is awaiting administrative review.\n\n"
            . "Request Reference: {$requestReference}\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}\n"
            . "Status: " . ucfirst($status) . "\n";
        if ($planName !== '') {
            $plainBody .= "Plan: {$planName}\n";
        }
        if ($network !== '') {
            $plainBody .= "Network: {$network}\n";
        }
        if ($depositFee > 0) {
            $plainBody .= "Deposit Fee: {$feeFormatted}\n"
                . "Credit Amount: {$creditFormatted}\n";
        }
        $plainBody .= "\nThis is a simulated demo deposit. No real cryptocurrency payment was processed.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'deposit_user');
    }

    public static function sendDepositAdminNotification(string $adminEmail, string $fullName, float $amount, string $method, string $requestReference = '', string $planName = '', string $network = '', string $payerAccount = ''): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "New deposit request - {$siteName}";

        $bodyHtml = '<p>Hello,</p>'
            . '<p>A new deposit request has been submitted.</p>'
            . '<p><strong>User:</strong> ' . self::e($fullName) . '<br>'
            . '<strong>Request Reference:</strong> ' . self::e($requestReference) . '<br>'
            . '<strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '</p>';
        if ($planName !== '') {
            $bodyHtml .= '<p><strong>Plan:</strong> ' . self::e($planName) . '<br>';
        }
        if ($network !== '') {
            $bodyHtml .= '<strong>Network:</strong> ' . self::e($network) . '<br>';
        }
        if ($payerAccount !== '') {
            $bodyHtml .= '<strong>Payer Account:</strong> ' . self::e($payerAccount) . '<br>';
        }
        $bodyHtml .= '</p>';
        $bodyHtml .= '<p class="muted">Please review this deposit in the admin panel.</p>';

        $plainBody = "Hello,\n\n"
            . "A new deposit request has been submitted.\n\n"
            . "User: {$fullName}\n"
            . "Request Reference: {$requestReference}\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}\n";
        if ($planName !== '') {
            $plainBody .= "Plan: {$planName}\n";
        }
        if ($network !== '') {
            $plainBody .= "Network: {$network}\n";
        }
        if ($payerAccount !== '') {
            $plainBody .= "Payer Account: {$payerAccount}\n";
        }
        $plainBody .= "\nPlease review this deposit in the admin panel.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($adminEmail, $subject, $html, $plain, 'deposit_admin');
    }

    public static function sendDepositApprovedUserNotification(string $email, string $fullName, float $amount, string $method): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Deposit approved - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your deposit has been <strong>approved</strong> and credited to your account.</p>'
            . '<p><strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '</p>'
            . '<p class="muted">You can now use your balance to invest.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your deposit has been approved and credited to your account.\n\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}\n\n"
            . "You can now use your balance to invest.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'deposit_approved_user');
    }

    public static function sendDepositApprovedAdminNotification(string $adminEmail, string $fullName, float $amount, string $method): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Deposit approved - {$siteName}";

        $bodyHtml = '<p>Hello,</p>'
            . '<p>A deposit has been approved.</p>'
            . '<p><strong>User:</strong> ' . self::e($fullName) . '<br>'
            . '<strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '</p>';

        $plainBody = "Hello,\n\n"
            . "A deposit has been approved.\n\n"
            . "User: {$fullName}\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($adminEmail, $subject, $html, $plain, 'deposit_approved_admin');
    }

    public static function sendDepositExpiredUserNotification(string $email, string $fullName, float $amount, string $method): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Deposit expired - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your deposit request has <strong>expired</strong> and was not credited.</p>'
            . '<p><strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '</p>'
            . '<p class="muted">Please submit a new deposit if you wish to continue.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your deposit request has expired and was not credited.\n\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}\n\n"
            . "Please submit a new deposit if you wish to continue.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'deposit_expired_user');
    }

    public static function sendDepositRejectedUserNotification(string $email, string $fullName, float $amount, string $method, string $reason = ''): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Deposit rejected - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your deposit request has been <strong>rejected</strong>.</p>'
            . '<p><strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '</p>';
        if ($reason !== '') {
            $bodyHtml .= '<p><strong>Reason:</strong> ' . self::e($reason) . '</p>';
        }
        $bodyHtml .= '<p class="muted">This is a demo deposit request. No real funds were processed.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your deposit request has been rejected.\n\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}\n";
        if ($reason !== '') {
            $plainBody .= "Reason: {$reason}\n";
        }
        $plainBody .= "\nThis is a demo deposit request. No real funds were processed.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'deposit_rejected_user');
    }

    // ─── Withdrawal Notifications ─────────────────────────────────────────────

    public static function sendWithdrawalRequestUserNotification(string $email, string $fullName, float $amount, string $method): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Withdrawal request submitted - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your withdrawal request has been submitted successfully.</p>'
            . '<p><strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '<br>'
            . '<strong>Status:</strong> Pending</p>'
            . '<p class="muted">You will receive another notification once your withdrawal is processed.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your withdrawal request has been submitted successfully.\n\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}\n"
            . "Status: Pending\n\n"
            . "You will receive another notification once your withdrawal is processed.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'withdrawal_request_user');
    }

    public static function sendWithdrawalRequestAdminNotification(string $adminEmail, string $fullName, float $amount, string $method): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "New withdrawal request - {$siteName}";

        $bodyHtml = '<p>Hello,</p>'
            . '<p>A new withdrawal request has been submitted.</p>'
            . '<p><strong>User:</strong> ' . self::e($fullName) . '<br>'
            . '<strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '</p>'
            . '<p class="muted">Please review this withdrawal in the admin panel.</p>';

        $plainBody = "Hello,\n\n"
            . "A new withdrawal request has been submitted.\n\n"
            . "User: {$fullName}\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}\n\n"
            . "Please review this withdrawal in the admin panel.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($adminEmail, $subject, $html, $plain, 'withdrawal_request_admin');
    }

    public static function sendWithdrawalUserNotification(string $email, string $fullName, float $amount, string $method, string $status): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Withdrawal {$status} - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your withdrawal request has been <strong>' . self::e($status) . '</strong>.</p>'
            . '<p><strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your withdrawal request has been {$status}.\n\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'withdrawal_user');
    }

    public static function sendWithdrawalAdminNotification(string $adminEmail, string $fullName, float $amount, string $method, string $status): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Withdrawal {$status} - {$siteName}";

        $bodyHtml = '<p>Hello,</p>'
            . '<p>A withdrawal request has been <strong>' . self::e($status) . '</strong>.</p>'
            . '<p><strong>User:</strong> ' . self::e($fullName) . '<br>'
            . '<strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Method:</strong> ' . self::e($method) . '</p>';

        $plainBody = "Hello,\n\n"
            . "A withdrawal request has been {$status}.\n\n"
            . "User: {$fullName}\n"
            . "Amount: {$amountFormatted}\n"
            . "Method: {$method}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($adminEmail, $subject, $html, $plain, 'withdrawal_admin');
    }

    // ─── Bonus & Penalty Notifications ─────────────────────────────────────────

    public static function sendBonusNotification(string $email, string $fullName, float $amount, string $reason): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Bonus credited - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>A bonus has been credited to your account.</p>'
            . '<p><strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Reason:</strong> ' . self::e($reason) . '</p>'
            . '<p class="muted">Demo points have no cash value and cannot be redeemed or withdrawn.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "A bonus has been credited to your account.\n\n"
            . "Amount: {$amountFormatted}\n"
            . "Reason: {$reason}\n\n"
            . "Demo points have no cash value and cannot be redeemed or withdrawn.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'bonus');
    }

    public static function sendPenaltyNotification(string $email, string $fullName, float $amount, string $reason): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Penalty applied - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>A penalty has been applied to your account.</p>'
            . '<p><strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Reason:</strong> ' . self::e($reason) . '</p>'
            . '<p class="muted">Please contact support if you believe this is an error.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "A penalty has been applied to your account.\n\n"
            . "Amount: {$amountFormatted}\n"
            . "Reason: {$reason}\n\n"
            . "Please contact support if you believe this is an error.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'penalty');
    }

    // ─── Account Notifications ────────────────────────────────────────────────

    public static function sendAccountChangeNotification(string $email, string $fullName, string $changeDescription): bool
    {
        $siteName = self::siteName();
        $supportEmail = self::supportEmail();

        $subject = "Account updated - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your account information was updated.</p>'
            . '<p><strong>Change:</strong> ' . self::e($changeDescription) . '</p>'
            . '<p class="muted">If you did not make this change, please contact us immediately at <a href="mailto:' . self::e($supportEmail) . '">' . self::e($supportEmail) . '</a>.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your account information was updated.\n\n"
            . "Change: {$changeDescription}\n\n"
            . "If you did not make this change, please contact us immediately at: {$supportEmail}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'account_change');
    }

    public static function sendAccountUpdateConfirmation(string $email, string $fullName): bool
    {
        $siteName = self::siteName();

        $subject = "Account update confirmed - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your account has been updated successfully.</p>'
            . '<p class="muted">If you did not make this change, please contact support immediately.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your account has been updated successfully.\n\n"
            . "If you did not make this change, please contact support immediately.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'account_update');
    }

    public static function sendAdminUserSignupNotification(string $adminEmail, string $fullName, string $username, string $userEmail): bool
    {
        $siteName = self::siteName();

        $subject = "New user signup - {$siteName}";

        $bodyHtml = '<p>Hello,</p>'
            . '<p>A new user has registered.</p>'
            . '<p><strong>Name:</strong> ' . self::e($fullName) . '<br>'
            . '<strong>Username:</strong> ' . self::e($username) . '<br>'
            . '<strong>Email:</strong> ' . self::e($userEmail) . '</p>';

        $plainBody = "Hello,\n\n"
            . "A new user has registered.\n\n"
            . "Name: {$fullName}\n"
            . "Username: {$username}\n"
            . "Email: {$userEmail}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($adminEmail, $subject, $html, $plain, 'admin_user_signup');
    }

    public static function sendAccountActivatedAfterBruteForce(string $email, string $fullName): bool
    {
        $siteName = self::siteName();
        $supportEmail = self::supportEmail();

        $subject = "Account reactivated - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your account has been reactivated after a security hold.</p>'
            . '<p class="muted">If you have any questions, contact us at <a href="mailto:' . self::e($supportEmail) . '">' . self::e($supportEmail) . '</a>.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your account has been reactivated after a security hold.\n\n"
            . "If you have any questions, contact us at: {$supportEmail}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'account_activated_brute_force');
    }

    // ─── 2FA Notifications ────────────────────────────────────────────────────

    public static function send2faEnabledNotification(string $email, string $fullName): bool
    {
        $siteName = self::siteName();
        $supportEmail = self::supportEmail();

        $subject = "2FA enabled - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Two-factor authentication has been <strong>enabled</strong> on your account.</p>'
            . '<p class="muted">If you did not enable this, please contact us immediately at <a href="mailto:' . self::e($supportEmail) . '">' . self::e($supportEmail) . '</a>.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Two-factor authentication has been enabled on your account.\n\n"
            . "If you did not enable this, please contact us immediately at: {$supportEmail}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, '2fa_enabled');
    }

    public static function send2faDisabledNotification(string $email, string $fullName): bool
    {
        $siteName = self::siteName();
        $supportEmail = self::supportEmail();

        $subject = "2FA disabled - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Two-factor authentication has been <strong>disabled</strong> on your account.</p>'
            . '<p class="muted">If you did not disable this, please contact us immediately at <a href="mailto:' . self::e($supportEmail) . '">' . self::e($supportEmail) . '</a>.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Two-factor authentication has been disabled on your account.\n\n"
            . "If you did not disable this, please contact us immediately at: {$supportEmail}";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, '2fa_disabled');
    }

    // ─── Referral Notifications ───────────────────────────────────────────────

    public static function sendReferralSignupNotification(string $email, string $fullName, string $referredName): bool
    {
        $siteName = self::siteName();

        $subject = "New referral signup - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Someone using your referral link has just signed up.</p>'
            . '<p><strong>Referred user:</strong> ' . self::e($referredName) . '</p>'
            . '<p class="muted">Demo points have no cash value and cannot be redeemed or withdrawn.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Someone using your referral link has just signed up.\n\n"
            . "Referred user: {$referredName}\n\n"
            . "Demo points have no cash value and cannot be redeemed or withdrawn.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'referral_signup');
    }

    public static function sendReferralCommissionNotification(string $email, string $fullName, float $amount, string $referredName): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Referral commission earned - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>You have earned a referral commission.</p>'
            . '<p><strong>Amount:</strong> ' . self::e($amountFormatted) . '<br>'
            . '<strong>Referred user:</strong> ' . self::e($referredName) . '</p>'
            . '<p class="muted">Demo points have no cash value and cannot be redeemed or withdrawn.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "You have earned a referral commission.\n\n"
            . "Amount: {$amountFormatted}\n"
            . "Referred user: {$referredName}\n\n"
            . "Demo points have no cash value and cannot be redeemed or withdrawn.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'referral_commission');
    }

    // ─── Other Notifications ──────────────────────────────────────────────────

    public static function sendTopupBalanceNotification(string $email, string $fullName, float $amount): bool
    {
        $siteName = self::siteName();
        $currency = '$';
        $amountFormatted = $currency . number_format($amount, 2);

        $subject = "Balance topped up - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your account balance has been topped up.</p>'
            . '<p><strong>Amount:</strong> ' . self::e($amountFormatted) . '</p>'
            . '<p class="muted">Demo points have no cash value and cannot be redeemed or withdrawn.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your account balance has been topped up.\n\n"
            . "Amount: {$amountFormatted}\n\n"
            . "Demo points have no cash value and cannot be redeemed or withdrawn.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'topup_balance');
    }

    public static function sendPinToUserNotification(string $email, string $fullName, string $pin): bool
    {
        $siteName = self::siteName();

        $subject = "Your PIN - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your PIN is: <strong>' . self::e($pin) . '</strong></p>'
            . '<p class="muted">Please keep this PIN secure and do not share it with anyone.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your PIN is: {$pin}\n\n"
            . "Please keep this PIN secure and do not share it with anyone.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'send_pin');
    }

    public static function sendTransactionCodeRecovery(string $email, string $fullName, string $code): bool
    {
        $siteName = self::siteName();

        $subject = "Transaction code recovery - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>Your transaction recovery code is: <strong>' . self::e($code) . '</strong></p>'
            . '<p class="muted">Please keep this code secure and do not share it with anyone.</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "Your transaction recovery code is: {$code}\n\n"
            . "Please keep this code secure and do not share it with anyone.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'transaction_code_recovery');
    }

    public static function sendTellAFriend(string $email, string $friendName, string $referralLink): bool
    {
        $siteName = self::siteName();

        $subject = "{$friendName} invites you to {$siteName}";

        $bodyHtml = '<p>Hello,</p>'
            . '<p><strong>' . self::e($friendName) . '</strong> has invited you to join <strong>' . self::e($siteName) . '</strong>.</p>'
            . '<p><a class="button" href="' . self::e($referralLink) . '">Join now</a></p>'
            . '<p class="muted">Demo points have no cash value and cannot be redeemed or withdrawn.</p>';

        $plainBody = "Hello,\n\n"
            . "{$friendName} has invited you to join {$siteName}.\n\n"
            . "Join now: {$referralLink}\n\n"
            . "Demo points have no cash value and cannot be redeemed or withdrawn.";

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'tell_a_friend');
    }

    public static function sendExchangeAdminNotification(string $adminEmail, string $currency, float $rate): bool
    {
        $siteName = self::siteName();

        $subject = "Exchange rate updated - {$siteName}";

        $bodyHtml = '<p>Hello,</p>'
            . '<p>An exchange rate has been updated.</p>'
            . '<p><strong>Currency:</strong> ' . self::e($currency) . '<br>'
            . '<strong>New rate:</strong> ' . self::e(number_format($rate, 6)) . '</p>';

        $plainBody = "Hello,\n\n"
            . "An exchange rate has been updated.\n\n"
            . "Currency: {$currency}\n"
            . "New rate: " . number_format($rate, 6);

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($adminEmail, $subject, $html, $plain, 'exchange_admin');
    }

    public static function sendExchangeUserNotification(string $email, string $fullName, string $currency, float $rate): bool
    {
        $siteName = self::siteName();

        $subject = "Exchange rate updated - {$siteName}";

        $bodyHtml = '<p>Hello <strong>' . self::e($fullName) . '</strong>,</p>'
            . '<p>An exchange rate has been updated.</p>'
            . '<p><strong>Currency:</strong> ' . self::e($currency) . '<br>'
            . '<strong>New rate:</strong> ' . self::e(number_format($rate, 6)) . '</p>';

        $plainBody = "Hello {$fullName},\n\n"
            . "An exchange rate has been updated.\n\n"
            . "Currency: {$currency}\n"
            . "New rate: " . number_format($rate, 6);

        [$html, $plain] = self::layout($subject, $bodyHtml, $plainBody);

        return self::send($email, $subject, $html, $plain, 'exchange_user');
    }
}
