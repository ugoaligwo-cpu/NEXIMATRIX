USE neximatrix;

CREATE TABLE IF NOT EXISTS info_boxes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  box_type ENUM('info', 'warning', 'success', 'danger') NOT NULL DEFAULT 'info',
  display_location ENUM('dashboard', 'all_pages', 'login_page', 'register_page') NOT NULL DEFAULT 'dashboard',
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_info_boxes_visible (is_visible, display_location),
  KEY idx_info_boxes_dates (starts_at, ends_at),
  CONSTRAINT fk_info_boxes_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;
