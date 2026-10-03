USE neximatrix;

CREATE TABLE IF NOT EXISTS account_blacklist (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL,
  blacklisted_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_blacklist_user (user_id),
  KEY idx_blacklist_created (created_at),
  CONSTRAINT fk_blacklist_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_blacklist_admin FOREIGN KEY (blacklisted_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;
