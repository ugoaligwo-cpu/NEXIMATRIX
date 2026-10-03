<?php
declare(strict_types=1);

function neximatrix_admin_content_pages_list(PDO $pdo): array
{
    return $pdo->query('SELECT id, slug, title, status, published_at, created_at, updated_at FROM content_pages ORDER BY title')->fetchAll();
}

function neximatrix_admin_content_page_get(PDO $pdo, int $pageId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM content_pages WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $pageId]);
    $page = $stmt->fetch();
    return $page === false ? null : $page;
}

function neximatrix_admin_content_page_create(PDO $pdo, string $slug, string $title, string $body, string $status, int $adminId): array
{
    $stmt = $pdo->prepare(
        'INSERT INTO content_pages (slug, title, body, status, published_at) VALUES (:slug, :title, :body, :status, :published_at)'
    );
    $stmt->execute([
        ':slug' => $slug,
        ':title' => $title,
        ':body' => $body,
        ':status' => $status,
        ':published_at' => $status === 'published' ? gmdate('Y-m-d H:i:s') : null,
    ]);
    $id = (int) $pdo->lastInsertId();
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.content.page_created', 'content_page', $id, ['slug' => $slug, 'status' => $status]);
    return neximatrix_admin_content_page_get($pdo, $id);
}

function neximatrix_admin_content_page_update(PDO $pdo, int $pageId, array $input, int $adminId): array
{
    $page = neximatrix_admin_content_page_get($pdo, $pageId);
    if ($page === null) {
        neximatrix_http_error('Page not found.', 404);
    }

    $fields = [];
    $params = [':id' => $pageId];

    if (array_key_exists('title', $input)) {
        $title = neximatrix_string($input['title'], 2, 190);
        if ($title === '') neximatrix_http_error('Title is required.', 422);
        $fields[] = 'title = :title';
        $params[':title'] = $title;
    }
    if (array_key_exists('body', $input)) {
        $fields[] = 'body = :body';
        $params[':body'] = neximatrix_string($input['body'], 0, 50000);
    }
    if (array_key_exists('status', $input)) {
        $status = $input['status'];
        if (!in_array($status, ['draft', 'published'], true)) {
            neximatrix_http_error('Invalid status.', 422);
        }
        $fields[] = 'status = :status';
        $params[':status'] = $status;
        if ($status === 'published' && $page['published_at'] === null) {
            $fields[] = 'published_at = :published_at';
            $params[':published_at'] = gmdate('Y-m-d H:i:s');
        }
    }
    if ($fields === []) {
        neximatrix_http_error('No fields to update.', 422);
    }

    $pdo->prepare('UPDATE content_pages SET ' . implode(', ', $fields) . ', updated_at = UTC_TIMESTAMP() WHERE id = :id')->execute($params);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.content.page_updated', 'content_page', $pageId, ['fields' => array_keys($input)]);
    return neximatrix_admin_content_page_get($pdo, $pageId);
}

function neximatrix_admin_content_page_delete(PDO $pdo, int $pageId, int $adminId): void
{
    $page = neximatrix_admin_content_page_get($pdo, $pageId);
    if ($page === null) {
        neximatrix_http_error('Page not found.', 404);
    }
    $pdo->prepare('DELETE FROM content_pages WHERE id = :id')->execute([':id' => $pageId]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.content.page_deleted', 'content_page', $pageId);
}

function neximatrix_admin_news_list(PDO $pdo): array
{
    return $pdo->query('SELECT id, title, slug, excerpt, status, published_at, created_at, updated_at FROM news_articles ORDER BY created_at DESC')->fetchAll();
}

function neximatrix_admin_news_create(PDO $pdo, string $title, string $slug, string $excerpt, string $body, string $status, int $adminId): array
{
    $stmt = $pdo->prepare(
        'INSERT INTO news_articles (title, slug, excerpt, body, status, published_at) VALUES (:title, :slug, :excerpt, :body, :status, :published_at)'
    );
    $stmt->execute([
        ':title' => $title,
        ':slug' => $slug,
        ':excerpt' => $excerpt,
        ':body' => $body,
        ':status' => $status,
        ':published_at' => $status === 'published' ? gmdate('Y-m-d H:i:s') : null,
    ]);
    $id = (int) $pdo->lastInsertId();
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.content.news_created', 'news_article', $id);
    $stmt = $pdo->prepare('SELECT id, title, slug, status, published_at FROM news_articles WHERE id = :id');
    $stmt->execute([':id' => $id]);
    return $stmt->fetch();
}

function neximatrix_admin_faqs_list(PDO $pdo): array
{
    return $pdo->query('SELECT id, question, answer, sort_order, is_active, created_at, updated_at FROM faqs ORDER BY sort_order')->fetchAll();
}

function neximatrix_admin_faq_create(PDO $pdo, string $question, string $answer, int $sortOrder, int $adminId): array
{
    $stmt = $pdo->prepare('INSERT INTO faqs (question, answer, sort_order) VALUES (:question, :answer, :sort_order)');
    $stmt->execute([':question' => $question, ':answer' => $answer, ':sort_order' => $sortOrder]);
    $id = (int) $pdo->lastInsertId();
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.content.faq_created', 'faq', $id);
    $stmt = $pdo->prepare('SELECT id, question, answer, sort_order, is_active FROM faqs WHERE id = :id');
    $stmt->execute([':id' => $id]);
    return $stmt->fetch();
}

function neximatrix_admin_faq_update(PDO $pdo, int $faqId, array $input, int $adminId): void
{
    $fields = [];
    $params = [':id' => $faqId];
    if (array_key_exists('question', $input)) {
        $q = neximatrix_string($input['question'], 3, 500);
        if ($q === '') neximatrix_http_error('Question is required.', 422);
        $fields[] = 'question = :question';
        $params[':question'] = $q;
    }
    if (array_key_exists('answer', $input)) {
        $fields[] = 'answer = :answer';
        $params[':answer'] = neximatrix_string($input['answer'], 0, 10000);
    }
    if (array_key_exists('is_active', $input)) {
        $fields[] = 'is_active = :is_active';
        $params[':is_active'] = filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }
    if ($fields === []) {
        neximatrix_http_error('No fields to update.', 422);
    }
    $pdo->prepare('UPDATE faqs SET ' . implode(', ', $fields) . ', updated_at = UTC_TIMESTAMP() WHERE id = :id')->execute($params);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.content.faq_updated', 'faq', $faqId);
}

function neximatrix_admin_faq_delete(PDO $pdo, int $faqId, int $adminId): void
{
    $pdo->prepare('DELETE FROM faqs WHERE id = :id')->execute([':id' => $faqId]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.content.faq_deleted', 'faq', $faqId);
}

function neximatrix_admin_settings_get_all(PDO $pdo): array
{
    return neximatrix_get_all_settings($pdo);
}

function neximatrix_admin_settings_update(PDO $pdo, array $settings, int $adminId): array
{
    return neximatrix_update_settings($pdo, $settings, $adminId);
}
