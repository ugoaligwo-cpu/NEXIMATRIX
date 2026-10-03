USE neximatrix;

CREATE TABLE IF NOT EXISTS referral_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NOT NULL,
  value_type ENUM('text', 'json', 'number', 'boolean') NOT NULL DEFAULT 'text',
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referral_settings_key (setting_key),
  CONSTRAINT fk_referral_settings_admin FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO referral_settings (setting_key, setting_value, value_type) VALUES
  ('referral_enabled', '1', 'boolean'),
  ('referral_link_display', '1', 'boolean'),
  ('referral_code_format', 'username', 'text'),
  ('referral_attribution', 'first_click', 'text'),
  ('referral_privacy', 'show_username', 'text'),
  ('referral_terms', 'Refer friends to earn demo points. Points have no cash value and cannot be redeemed.', 'text'),
  ('referral_email_template', 'referral_info', 'text'),
  ('referral_demo_points', '100', 'number'),
  ('referral_max_levels', '1', 'number'),
  ('referral_commission_rate', '0', 'number')
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

CREATE TABLE IF NOT EXISTS referral_event_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  referral_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(60) NOT NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_referral_event_logs_referral (referral_id),
  KEY idx_referral_event_logs_type (event_type),
  KEY idx_referral_event_logs_created (created_at)
) ENGINE=InnoDB;
