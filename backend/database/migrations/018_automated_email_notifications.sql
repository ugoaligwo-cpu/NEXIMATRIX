USE neximatrix;

-- ─── Automated Email Notifications ──────────────────────────────────────────
-- Replace template-based email system with automated transactional emails.

-- Add notification_type column to email_logs (if not exists)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_logs' AND COLUMN_NAME = 'notification_type');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE email_logs ADD COLUMN notification_type VARCHAR(60) NOT NULL DEFAULT ''general'' AFTER error',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop the FK to email_templates (templates are no longer used)
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_logs' AND CONSTRAINT_NAME = 'fk_email_logs_template');
SET @sql = IF(@fk_exists > 0, 'ALTER TABLE email_logs DROP FOREIGN KEY fk_email_logs_template', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop the template_id column (no longer needed)
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_logs' AND COLUMN_NAME = 'template_id');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE email_logs DROP COLUMN template_id', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on notification_type
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_logs' AND INDEX_NAME = 'idx_email_logs_notification_type');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE email_logs ADD INDEX idx_email_logs_notification_type (notification_type)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add login_notification_enabled setting
INSERT INTO site_settings (setting_key, setting_value, value_type, is_public)
VALUES ('login_notification_enabled', '1', 'boolean', 0)
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
