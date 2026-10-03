<?php
declare(strict_types=1);

function neximatrix_admin_support_list(PDO $pdo, string $search = '', string $status = '', int $limit = 20, int $offset = 0): array
{
    $where = ['1 = 1'];
    $params = [];

    if ($search !== '') {
        $where[] = '(t.subject LIKE :search_subject OR u.email LIKE :search_email OR u.username LIKE :search_username)';
        $params[':search_subject'] = '%' . $search . '%';
        $params[':search_email'] = '%' . $search . '%';
        $params[':search_username'] = '%' . $search . '%';
    }
    if (in_array($status, ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'], true)) {
        $where[] = 't.status = :status';
        $params[':status'] = $status;
    }

    $whereSql = implode(' AND ', $where);
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM support_tickets t INNER JOIN users u ON u.id = t.user_id WHERE {$whereSql}");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = "SELECT t.id, t.user_id, t.subject, t.status, t.priority, t.last_message_at,
                   t.created_at, t.updated_at, u.username, u.full_name, u.email,
                   (SELECT COUNT(*) FROM support_messages sm WHERE sm.ticket_id = t.id AND sm.is_internal = 0) AS message_count
            FROM support_tickets t INNER JOIN users u ON u.id = t.user_id
            WHERE {$whereSql}
            ORDER BY t.updated_at DESC
            LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    return ['items' => $stmt->fetchAll(), 'total' => $total, 'limit' => $limit, 'offset' => $offset];
}

function neximatrix_admin_support_ticket(PDO $pdo, int $ticketId): ?array
{
    $stmt = $pdo->prepare(
        "SELECT t.*, u.username, u.full_name, u.email
         FROM support_tickets t INNER JOIN users u ON u.id = t.user_id
         WHERE t.id = :id LIMIT 1"
    );
    $stmt->execute([':id' => $ticketId]);
    $ticket = $stmt->fetch();
    if ($ticket === false) return null;

    $messages = $pdo->prepare(
        'SELECT id, ticket_id, author_user_id, author_type, body, is_internal, created_at
         FROM support_messages WHERE ticket_id = :id ORDER BY created_at ASC'
    );
    $messages->execute([':id' => $ticketId]);
    $ticket['messages'] = $messages->fetchAll();
    return $ticket;
}

function neximatrix_admin_support_reply(PDO $pdo, int $ticketId, int $adminId, string $body, bool $internal = false): array
{
    $ticket = neximatrix_admin_support_ticket($pdo, $ticketId);
    if ($ticket === null) {
        neximatrix_http_error('Support ticket not found.', 404);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO support_messages (ticket_id, author_user_id, author_type, body, is_internal)
         VALUES (:ticket_id, :author_id, :author_type, :body, :internal)'
    );
    $stmt->execute([
        ':ticket_id' => $ticketId,
        ':author_id' => $adminId,
        ':author_type' => 'admin',
        ':body' => $body,
        ':internal' => $internal ? 1 : 0,
    ]);

    if (!$internal) {
        $pdo->prepare("UPDATE support_tickets SET status = 'in_progress', last_message_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = :id")
            ->execute([':id' => $ticketId]);
        neximatrix_create_notification($pdo, (int) $ticket['user_id'], 'Support response received', 'Your support ticket has received a new response.', 'support');
    }

    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.support.replied', 'support_ticket', $ticketId, ['internal' => $internal]);
    return neximatrix_admin_support_ticket($pdo, $ticketId);
}

function neximatrix_admin_support_status(PDO $pdo, int $ticketId, string $status, int $adminId): void
{
    if (!in_array($status, ['open', 'in_progress', 'waiting_for_user', 'resolved', 'closed'], true)) {
        neximatrix_http_error('Invalid ticket status.', 422);
    }
    $ticket = neximatrix_admin_support_ticket($pdo, $ticketId);
    if ($ticket === null) {
        neximatrix_http_error('Support ticket not found.', 404);
    }

    $pdo->prepare("UPDATE support_tickets SET status = :status, updated_at = UTC_TIMESTAMP() WHERE id = :id")
        ->execute([':status' => $status, ':id' => $ticketId]);

    if (in_array($status, ['resolved', 'closed'], true)) {
        neximatrix_create_notification($pdo, (int) $ticket['user_id'], 'Support ticket updated', "Your support ticket status was updated to: {$status}.", 'support');
    }

    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.support.status_changed', 'support_ticket', $ticketId, ['status' => $status]);
}

function neximatrix_admin_support_priority(PDO $pdo, int $ticketId, string $priority, int $adminId): void
{
    if (!in_array($priority, ['low', 'normal', 'high', 'urgent'], true)) {
        neximatrix_http_error('Invalid priority.', 422);
    }
    $pdo->prepare("UPDATE support_tickets SET priority = :priority, updated_at = UTC_TIMESTAMP() WHERE id = :id")
        ->execute([':priority' => $priority, ':id' => $ticketId]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.support.priority_changed', 'support_ticket', $ticketId, ['priority' => $priority]);
}

function neximatrix_admin_support_assign(PDO $pdo, int $ticketId, int $assigneeId, int $adminId): void
{
    $ticket = neximatrix_admin_support_ticket($pdo, $ticketId);
    if ($ticket === null) {
        neximatrix_http_error('Support ticket not found.', 404);
    }
    $assignee = neximatrix_user_by_id($pdo, $assigneeId);
    if ($assignee === null) {
        neximatrix_http_error('Assignee not found.', 404);
    }
    $pdo->prepare("UPDATE support_tickets SET assigned_to = :assigned_to, updated_at = UTC_TIMESTAMP() WHERE id = :id")
        ->execute([':assigned_to' => $assigneeId, ':id' => $ticketId]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.support.assigned', 'support_ticket', $ticketId, ['assigned_to' => $assigneeId]);
}

function neximatrix_admin_support_assignees_list(PDO $pdo): array
{
    return $pdo->query(
        "SELECT u.id, u.full_name, u.username
         FROM users u
         INNER JOIN user_roles ur ON ur.user_id = u.id
         INNER JOIN roles r ON r.id = ur.role_id
         WHERE r.name IN ('admin', 'super_admin')
         ORDER BY u.username"
    )->fetchAll();
}

function neximatrix_admin_notifications_list(PDO $pdo, int $limit = 50): array
{
    $stmt = $pdo->prepare(
        'SELECT n.id, n.user_id, n.title, n.message, n.type, n.read_at, n.created_at, u.username
         FROM notifications n LEFT JOIN users u ON u.id = n.user_id
         ORDER BY n.created_at DESC LIMIT :limit'
    );
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

function neximatrix_admin_notification_create(PDO $pdo, ?int $userId, string $title, string $message, string $type, int $adminId): int
{
    if ($userId !== null) {
        neximatrix_create_notification($pdo, $userId, $title, $message, $type);
    } else {
        $activeUsers = $pdo->query("SELECT id FROM users WHERE status = 'active'")->fetchAll(PDO::FETCH_COLUMN);
        $pdo->beginTransaction();
        try {
            foreach ($activeUsers as $activeUserId) {
                neximatrix_create_notification($pdo, (int) $activeUserId, $title, $message, $type);
            }
            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $e;
        }
    }
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.notification.created', 'notification', null, ['user_id' => $userId, 'type' => $type]);
    return 1;
}

function neximatrix_admin_announcements_list(PDO $pdo): array
{
    return $pdo->query('SELECT * FROM announcements ORDER BY created_at DESC')->fetchAll();
}

function neximatrix_admin_announcement_create(PDO $pdo, string $title, string $message, bool $dismissible, ?string $startsAt, ?string $endsAt, int $adminId): array
{
    $stmt = $pdo->prepare(
        'INSERT INTO announcements (title, message, is_dismissible, starts_at, ends_at) VALUES (:title, :message, :dismissible, :starts_at, :ends_at)'
    );
    $stmt->execute([
        ':title' => $title,
        ':message' => $message,
        ':dismissible' => $dismissible ? 1 : 0,
        ':starts_at' => $startsAt,
        ':ends_at' => $endsAt,
    ]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.announcement.created', 'announcement', (int) $pdo->lastInsertId());
    return ['id' => (int) $pdo->lastInsertId(), 'title' => $title, 'message' => $message];
}

function neximatrix_admin_contact_mark_read(PDO $pdo, int $submissionId, int $adminId): void
{
    $pdo->prepare('UPDATE contact_submissions SET is_read = 1 WHERE id = :id')->execute([':id' => $submissionId]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.contact.marked_read', 'contact_submission', $submissionId);
}
