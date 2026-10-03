USE neximatrix;

CREATE TABLE IF NOT EXISTS exchange_rates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  currency_code VARCHAR(3) NOT NULL,
  currency_name VARCHAR(50) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL DEFAULT 1.00000000,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_precision TINYINT UNSIGNED NOT NULL DEFAULT 2,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_exchange_currency (currency_code),
  KEY idx_exchange_active (is_active)
) ENGINE=InnoDB;

INSERT INTO exchange_rates (currency_code, currency_name, rate, is_active, display_precision, is_default) VALUES
  ('USD', 'US Dollar', 1.00000000, 1, 2, 1),
  ('EUR', 'Euro', 0.92000000, 1, 2, 0),
  ('GBP', 'British Pound', 0.79000000, 1, 2, 0),
  ('BTC', 'Bitcoin', 0.00001500, 1, 8, 0),
  ('ETH', 'Ethereum', 0.00029000, 1, 8, 0)
ON DUPLICATE KEY UPDATE currency_code = VALUES(currency_code);
