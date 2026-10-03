<?php
declare(strict_types=1);

function neximatrix_admin_homepage_sections_list(PDO $pdo): array
{
    return $pdo->query('SELECT * FROM homepage_sections ORDER BY display_order, title')->fetchAll();
}

function neximatrix_admin_homepage_section_get(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM homepage_sections WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $section = $stmt->fetch();
    return $section === false ? null : $section;
}

function neximatrix_admin_homepage_section_update(PDO $pdo, int $id, array $input, int $adminId): array
{
    $section = neximatrix_admin_homepage_section_get($pdo, $id);
    if ($section === null) {
        neximatrix_http_error('Homepage section not found.', 404);
    }

    $fields = [];
    $params = [':id' => $id];

    if (array_key_exists('title', $input)) {
        $title = neximatrix_string($input['title'], 2, 190);
        if ($title === '') neximatrix_http_error('Title is required.', 422);
        $fields[] = 'title = :title';
        $params[':title'] = $title;
    }
    if (array_key_exists('subtitle', $input)) {
        $fields[] = 'subtitle = :subtitle';
        $params[':subtitle'] = neximatrix_string($input['subtitle'], 0, 500);
    }
    if (array_key_exists('body', $input)) {
        $fields[] = 'body = :body';
        $params[':body'] = neximatrix_string($input['body'], 0, 50000);
    }
    if (array_key_exists('image_path', $input)) {
        $fields[] = 'image_path = :image_path';
        $params[':image_path'] = neximatrix_string($input['image_path'], 0, 255);
    }
    if (array_key_exists('cta_text', $input)) {
        $fields[] = 'cta_text = :cta_text';
        $params[':cta_text'] = neximatrix_string($input['cta_text'], 0, 80);
    }
    if (array_key_exists('cta_url', $input)) {
        $fields[] = 'cta_url = :cta_url';
        $params[':cta_url'] = neximatrix_string($input['cta_url'], 0, 255);
    }
    if (array_key_exists('display_order', $input)) {
        $fields[] = 'display_order = :display_order';
        $params[':display_order'] = (int) $input['display_order'];
    }
    if (array_key_exists('is_visible', $input)) {
        $fields[] = 'is_visible = :is_visible';
        $params[':is_visible'] = filter_var($input['is_visible'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }
    if (array_key_exists('status', $input)) {
        if (!in_array($input['status'], ['draft', 'published'], true)) {
            neximatrix_http_error('Invalid status.', 422);
        }
        $fields[] = 'status = :status';
        $params[':status'] = $input['status'];
        if ($input['status'] === 'published' && $section['published_at'] === null) {
            $fields[] = 'published_at = :published_at';
            $params[':published_at'] = gmdate('Y-m-d H:i:s');
        }
    }

    if ($fields === []) {
        neximatrix_http_error('No fields to update.', 422);
    }

    $pdo->prepare('UPDATE homepage_sections SET ' . implode(', ', $fields) . ', updated_at = UTC_TIMESTAMP() WHERE id = :id')->execute($params);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.homepage_section.updated', 'homepage_section', $id, ['fields' => array_keys($input)]);
    return neximatrix_admin_homepage_section_get($pdo, $id);
}

function neximatrix_admin_banners_list(PDO $pdo): array
{
    return $pdo->query('SELECT * FROM banners ORDER BY created_at DESC')->fetchAll();
}

function neximatrix_admin_banner_create(PDO $pdo, array $input, int $adminId): array
{
    $title = neximatrix_string($input['title'] ?? '', 2, 120);
    $message = neximatrix_string($input['message'] ?? '', 1, 5000);
    if ($title === '' || $message === '') {
        neximatrix_http_error('Title and message are required.', 422);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO banners (title, message, banner_type, is_dismissible, starts_at, ends_at, is_active)
         VALUES (:title, :message, :banner_type, :is_dismissible, :starts_at, :ends_at, :is_active)'
    );
    $stmt->execute([
        ':title' => $title,
        ':message' => $message,
        ':banner_type' => in_array($input['banner_type'] ?? '', ['info', 'warning', 'success', 'danger'], true) ? $input['banner_type'] : 'info',
        ':is_dismissible' => filter_var($input['is_dismissible'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
        ':starts_at' => !empty($input['starts_at']) ? neximatrix_string($input['starts_at'], 1, 19) : null,
        ':ends_at' => !empty($input['ends_at']) ? neximatrix_string($input['ends_at'], 1, 19) : null,
        ':is_active' => filter_var($input['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 1 : 0,
    ]);
    $id = (int) $pdo->lastInsertId();
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.banner.created', 'banner', $id);
    $stmt = $pdo->prepare('SELECT * FROM banners WHERE id = :id');
    $stmt->execute([':id' => $id]);
    return $stmt->fetch();
}

function neximatrix_admin_banner_update(PDO $pdo, int $id, array $input, int $adminId): array
{
    $banner = $pdo->prepare('SELECT * FROM banners WHERE id = :id LIMIT 1');
    $banner->execute([':id' => $id]);
    $banner = $banner->fetch();
    if ($banner === false) {
        neximatrix_http_error('Banner not found.', 404);
    }

    $fields = [];
    $params = [':id' => $id];

    if (array_key_exists('title', $input)) {
        $title = neximatrix_string($input['title'], 2, 120);
        if ($title === '') neximatrix_http_error('Title is required.', 422);
        $fields[] = 'title = :title';
        $params[':title'] = $title;
    }
    if (array_key_exists('message', $input)) {
        $fields[] = 'message = :message';
        $params[':message'] = neximatrix_string($input['message'], 1, 5000);
    }
    if (array_key_exists('banner_type', $input)) {
        $fields[] = 'banner_type = :banner_type';
        $params[':banner_type'] = $input['banner_type'];
    }
    if (array_key_exists('is_dismissible', $input)) {
        $fields[] = 'is_dismissible = :is_dismissible';
        $params[':is_dismissible'] = filter_var($input['is_dismissible'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }
    if (array_key_exists('is_active', $input)) {
        $fields[] = 'is_active = :is_active';
        $params[':is_active'] = filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    }

    if ($fields === []) {
        neximatrix_http_error('No fields to update.', 422);
    }

    $pdo->prepare('UPDATE banners SET ' . implode(', ', $fields) . ', updated_at = UTC_TIMESTAMP() WHERE id = :id')->execute($params);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.banner.updated', 'banner', $id, ['fields' => array_keys($input)]);
    $stmt = $pdo->prepare('SELECT * FROM banners WHERE id = :id');
    $stmt->execute([':id' => $id]);
    return $stmt->fetch();
}

function neximatrix_admin_banner_delete(PDO $pdo, int $id, int $adminId): void
{
    $pdo->prepare('DELETE FROM banners WHERE id = :id')->execute([':id' => $id]);
    neximatrix_log_activity($pdo, $adminId, 'admin', 'admin.banner.deleted', 'banner', $id);
}
