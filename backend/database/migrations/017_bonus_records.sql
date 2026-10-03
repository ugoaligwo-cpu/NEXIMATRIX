USE neximatrix;

CREATE TABLE IF NOT EXISTS bonus_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  bonus_id INT UNSIGNED NULL,
  amount DECIMAL(18, 8) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  awarded_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bonus_records_user (user_id),
  KEY idx_bonus_records_created (created_at),
  CONSTRAINT fk_bonus_records_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_bonus_records_bonus FOREIGN KEY (bonus_id) REFERENCES demo_bonuses (id) ON DELETE SET NULL,
  CONSTRAINT fk_bonus_records_admin FOREIGN KEY (awarded_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
