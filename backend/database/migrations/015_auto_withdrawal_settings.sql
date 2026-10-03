USE neximatrix;

CREATE TABLE IF NOT EXISTS auto_withdrawal_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  value_type ENUM('text', 'json', 'number', 'boolean') NOT NULL DEFAULT 'text',
  description VARCHAR(255) NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auto_withdrawal_key (setting_key),
  CONSTRAINT fk_auto_withdrawal_admin FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO auto_withdrawal_settings (setting_key, setting_value, value_type, description) VALUES
  ('auto_withdraw_enabled', '0', 'boolean', 'Enable automatic withdrawal categorization'),
  ('auto_withdraw_min_amount', '10', 'number', 'Minimum amount for auto-withdrawal'),
  ('auto_withdraw_max_amount', '10000', 'number', 'Maximum amount for auto-withdrawal'),
  ('auto_withdraw_review_required', '1', 'boolean', 'Require admin review before processing'),
  ('auto_withdraw_status_label', 'Auto-Processed', 'text', 'Status label for auto-processed withdrawals'),
  ('auto_withdraw_notification', '1', 'boolean', 'Send notification on auto-processing')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
