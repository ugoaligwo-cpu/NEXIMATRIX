USE neximatrix;

CREATE TABLE IF NOT EXISTS homepage_sections (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  section_key VARCHAR(80) NOT NULL,
  title VARCHAR(190) NOT NULL,
  subtitle VARCHAR(500) NULL,
  body TEXT NULL,
  image_path VARCHAR(255) NULL,
  cta_text VARCHAR(80) NULL,
  cta_url VARCHAR(255) NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_homepage_sections_key (section_key),
  KEY idx_homepage_sections_visible (is_visible, display_order)
) ENGINE=InnoDB;

INSERT INTO homepage_sections (section_key, title, subtitle, body, display_order, is_visible, status) VALUES
  ('hero', 'Welcome to neximatrix', 'Secure account management and support platform', 'Manage your profile, support requests, notifications, and account activity in one secure place.', 1, 1, 'published'),
  ('features', 'Platform Features', NULL, 'Profile controls, secure sessions, support tickets, notifications, and activity history.', 2, 1, 'published'),
  ('how_it_works', 'How It Works', NULL, 'Sign up, complete your profile, and use the support and notification tools available in your account center.', 3, 1, 'published'),
  ('cta', 'Get Started', 'Join neximatrix today', NULL, 4, 1, 'published')
ON DUPLICATE KEY UPDATE section_key = VALUES(section_key);

CREATE TABLE IF NOT EXISTS banners (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(120) NOT NULL,
  message TEXT NOT NULL,
  banner_type ENUM('info', 'warning', 'success', 'danger') NOT NULL DEFAULT 'info',
  is_dismissible TINYINT(1) NOT NULL DEFAULT 1,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_banners_active (is_active),
  KEY idx_banners_dates (starts_at, ends_at)
) ENGINE=InnoDB;
