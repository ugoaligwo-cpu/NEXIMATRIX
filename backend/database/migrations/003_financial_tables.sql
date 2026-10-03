USE neximatrix;

-- Wallet: one per user, tracks available balance
CREATE TABLE IF NOT EXISTS wallets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  balance DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallets_user (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Transaction ledger: records every financial event
CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('deposit', 'withdrawal', 'investment', 'profit', 'referral_bonus', 'deposit_fee', 'withdrawal_fee', 'adjustment') NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  fee DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000,
  balance_before DECIMAL(18, 8) NOT NULL,
  balance_after DECIMAL(18, 8) NOT NULL,
  reference_id BIGINT UNSIGNED NULL,
  reference_type VARCHAR(40) NULL,
  description VARCHAR(255) NULL,
  status ENUM('pending', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'completed',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_transactions_user_created (user_id, created_at),
  KEY idx_transactions_type (type),
  KEY idx_transactions_status (status),
  KEY idx_transactions_reference (reference_type, reference_id),
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Investment plans: configurable plans
CREATE TABLE IF NOT EXISTS investment_plans (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  min_deposit DECIMAL(18, 8) NOT NULL DEFAULT 10.00000000,
  max_deposit DECIMAL(18, 8) NOT NULL DEFAULT 100000.00000000,
  daily_return DECIMAL(8, 4) NOT NULL DEFAULT 0.0000,
  duration_days INT UNSIGNED NOT NULL DEFAULT 0,
  total_return DECIMAL(8, 4) NOT NULL DEFAULT 0.0000,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_plans_active_sort (is_active, sort_order)
) ENGINE=InnoDB;

-- Individual investments
CREATE TABLE IF NOT EXISTS investments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  plan_id INT UNSIGNED NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  daily_return DECIMAL(8, 4) NOT NULL,
  duration_days INT UNSIGNED NOT NULL,
  total_return DECIMAL(8, 4) NOT NULL,
  profit_earned DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000,
  last_profit_at DATETIME NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_investments_user_status (user_id, status),
  KEY idx_investments_status_dates (status, ends_at),
  KEY idx_investments_plan (plan_id),
  CONSTRAINT fk_investments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_investments_plan FOREIGN KEY (plan_id) REFERENCES investment_plans (id)
) ENGINE=InnoDB;

-- Deposit requests
CREATE TABLE IF NOT EXISTS deposits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  method VARCHAR(40) NOT NULL DEFAULT 'manual',
  reference VARCHAR(120) NULL,
  proof_file VARCHAR(255) NULL,
  admin_note VARCHAR(500) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_deposits_user_status (user_id, status),
  KEY idx_deposits_status (status),
  KEY idx_deposits_created (created_at),
  CONSTRAINT fk_deposits_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_deposits_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18, 8) NOT NULL,
  fee DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000,
  net_amount DECIMAL(18, 8) NOT NULL,
  method VARCHAR(40) NOT NULL DEFAULT 'bank',
  wallet_address VARCHAR(190) NOT NULL,
  admin_note VARCHAR(500) NULL,
  status ENUM('pending', 'approved', 'rejected', 'paid') NOT NULL DEFAULT 'pending',
  reviewed_by BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_withdrawals_user_status (user_id, status),
  KEY idx_withdrawals_status (status),
  KEY idx_withdrawals_created (created_at),
  CONSTRAINT fk_withdrawals_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_withdrawals_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Referral relationships
CREATE TABLE IF NOT EXISTS referrals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  referrer_id BIGINT UNSIGNED NOT NULL,
  referred_id BIGINT UNSIGNED NOT NULL,
  commission_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.1000,
  total_earned DECIMAL(18, 8) NOT NULL DEFAULT 0.00000000,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referrals_pair (referrer_id, referred_id),
  KEY idx_referrals_referrer (referrer_id),
  KEY idx_referrals_referred (referred_id),
  CONSTRAINT fk_referrals_referrer FOREIGN KEY (referrer_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_referrals_referred FOREIGN KEY (referred_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insert default investment plans
INSERT INTO investment_plans (name, description, min_deposit, max_deposit, daily_return, duration_days, total_return, is_active, sort_order) VALUES
  ('Basic Starter', 'Entry level plan for new investors', 10.00000000, 1000.00000000, 1.5000, 30, 45.0000, 1, 1),
  ('Silver Growth', 'Balanced returns for steady growth', 1000.00000000, 10000.00000000, 2.0000, 60, 120.0000, 1, 2),
  ('Gold Premium', 'High yield plan for serious investors', 10000.00000000, 50000.00000000, 2.5000, 90, 225.0000, 1, 3),
  ('Platinum Elite', 'Maximum returns for elite members', 50000.00000000, 100000.00000000, 3.0000, 120, 360.0000, 1, 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);
