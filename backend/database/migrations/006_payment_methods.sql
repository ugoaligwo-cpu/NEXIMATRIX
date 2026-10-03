USE neximatrix;

CREATE TABLE IF NOT EXISTS payment_method_display_configs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  method_key VARCHAR(80) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  icon_path VARCHAR(255) NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1,
  is_sandbox TINYINT(1) NOT NULL DEFAULT 1,
  supported_currencies VARCHAR(255) NULL,
  public_instructions TEXT NULL,
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_method_key (method_key),
  KEY idx_payment_method_enabled (is_enabled),
  KEY idx_payment_method_status (status),
  KEY idx_payment_method_order (display_order),
  CONSTRAINT fk_payment_method_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT INTO payment_method_display_configs (method_key, display_name, description, display_order, is_enabled, is_sandbox, supported_currencies, public_instructions) VALUES
  ('demo_card', 'Demo Card', 'Demonstration card method for testing display only.', 1, 1, 1, 'USD', 'This is a demo payment method. No real transactions are processed.'),
  ('sandbox_wallet', 'Sandbox Wallet', 'Sandbox wallet for testing payment flows.', 2, 1, 1, 'USD,EUR', 'Sandbox environment only. No real funds are transferred.'),
  ('test_payment', 'Test Payment Method', 'Generic test payment method for development.', 3, 1, 1, 'USD', 'For development testing only. Not a real payment method.')
ON DUPLICATE KEY UPDATE method_key = VALUES(method_key);
