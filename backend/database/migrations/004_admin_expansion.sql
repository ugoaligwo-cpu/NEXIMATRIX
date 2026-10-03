USE neximatrix;

-- ─── RBAC ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_roles_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_permissions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_permissions_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id INT UNSIGNED NOT NULL,
  permission_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_arp_role FOREIGN KEY (role_id) REFERENCES admin_roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_arp_permission FOREIGN KEY (permission_id) REFERENCES admin_permissions (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_aur_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_aur_role FOREIGN KEY (role_id) REFERENCES admin_roles (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Login & Security Tracking ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  identifier VARCHAR(190) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_login_attempts_user (user_id),
  KEY idx_login_attempts_identifier (identifier),
  KEY idx_login_attempts_created (created_at),
  CONSTRAINT fk_login_attempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS security_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(60) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  details JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_security_events_user (user_id),
  KEY idx_security_events_type (event_type),
  KEY idx_security_events_created (created_at),
  CONSTRAINT fk_security_events_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_notes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  admin_id BIGINT UNSIGNED NOT NULL,
  note TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_notes_user (user_id),
  KEY idx_user_notes_admin (admin_id),
  CONSTRAINT fk_user_notes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_notes_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admin_ip_allowlist (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  admin_id BIGINT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  description VARCHAR(190) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ip_allowlist_admin (admin_id),
  CONSTRAINT fk_ip_allowlist_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ─── Content Management ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_pages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(100) NOT NULL,
  title VARCHAR(190) NOT NULL,
  body TEXT NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_content_pages_slug (slug),
  KEY idx_content_pages_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS news_articles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(190) NOT NULL,
  slug VARCHAR(190) NOT NULL,
  excerpt VARCHAR(500) NULL,
  body TEXT NULL,
  status ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_news_slug (slug),
  KEY idx_news_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS faqs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question VARCHAR(500) NOT NULL,
  answer TEXT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_faqs_active_order (is_active, sort_order)
) ENGINE=InnoDB;

-- ─── Email ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  variables JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_templates_name (name),
  KEY idx_email_templates_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient VARCHAR(190) NOT NULL,
  template_id INT UNSIGNED NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('sent', 'failed', 'queued') NOT NULL DEFAULT 'queued',
  error TEXT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_logs_recipient (recipient),
  KEY idx_email_logs_template (template_id),
  KEY idx_email_logs_sent (sent_at),
  CONSTRAINT fk_email_logs_template FOREIGN KEY (template_id) REFERENCES email_templates (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Communication ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(190) NOT NULL,
  is_subscribed TINYINT(1) NOT NULL DEFAULT 1,
  unsubscribed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_newsletter_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contact_submissions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(190) NOT NULL,
  email VARCHAR(190) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_submissions_read (is_read),
  KEY idx_contact_submissions_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(190) NOT NULL,
  message TEXT NOT NULL,
  is_dismissible TINYINT(1) NOT NULL DEFAULT 1,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcements_dates (starts_at, ends_at)
) ENGINE=InnoDB;

-- ─── System ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  level ENUM('debug', 'info', 'notice', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info',
  channel VARCHAR(60) NOT NULL DEFAULT 'app',
  message TEXT NOT NULL,
  context JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_system_logs_level (level),
  KEY idx_system_logs_channel (channel),
  KEY idx_system_logs_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS backups (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  filename VARCHAR(190) NOT NULL,
  size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('completed', 'failed', 'in_progress') NOT NULL DEFAULT 'in_progress',
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_backups_created (created_at),
  CONSTRAINT fk_backups_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ─── Seed Default Data ───────────────────────────────────────────────────────

INSERT INTO admin_roles (name, description) VALUES
  ('super_admin', 'Full application administration'),
  ('user_admin', 'User management and account status'),
  ('support_admin', 'Support tickets and user communication'),
  ('content_admin', 'Website pages, news, notices, email templates'),
  ('system_admin', 'General settings, diagnostics, security settings')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO admin_permissions (name, description) VALUES
  ('users.view', 'View user list and details'),
  ('users.edit', 'Edit permitted user profile fields'),
  ('users.status', 'Change account status'),
  ('users.notes', 'View and add admin notes on users'),
  ('support.view', 'View support tickets'),
  ('support.reply', 'Reply to support tickets'),
  ('support.internal', 'Add internal notes to tickets'),
  ('support.status', 'Change ticket status'),
  ('notifications.create', 'Create notifications'),
  ('notifications.edit', 'Edit existing notifications'),
  ('content.create', 'Create content pages and news'),
  ('content.edit', 'Edit existing content'),
  ('content.publish', 'Publish and unpublish content'),
  ('settings.general', 'Edit general website settings'),
  ('settings.branding', 'Edit branding and theme'),
  ('settings.registration', 'Edit registration settings'),
  ('settings.seo', 'Edit SEO metadata'),
  ('email.templates', 'Manage email templates'),
  ('email.send', 'Send newsletters'),
  ('security.view', 'View security logs and login history'),
  ('security.edit', 'Edit security settings'),
  ('system.view', 'View system information and logs'),
  ('system.backup', 'Create database backups'),
  ('admins.manage', 'Manage admin accounts and roles'),
  ('admins.assign', 'Assign roles to admin accounts')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Assign all permissions to super_admin
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM admin_roles r, admin_permissions p WHERE r.name = 'super_admin';

-- Assign permissions to user_admin
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM admin_roles r, admin_permissions p
  WHERE r.name = 'user_admin'
    AND p.name IN ('users.view', 'users.edit', 'users.status', 'users.notes', 'support.view');

-- Assign permissions to support_admin
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM admin_roles r, admin_permissions p
  WHERE r.name = 'support_admin'
    AND p.name IN ('support.view', 'support.reply', 'support.internal', 'support.status', 'users.view', 'notifications.create', 'email.send');

-- Assign permissions to content_admin
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM admin_roles r, admin_permissions p
  WHERE r.name = 'content_admin'
    AND p.name IN ('content.create', 'content.edit', 'content.publish', 'email.templates', 'notifications.create', 'notifications.edit');

-- Assign permissions to system_admin
INSERT IGNORE INTO admin_role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM admin_roles r, admin_permissions p
  WHERE r.name = 'system_admin'
    AND p.name IN ('settings.general', 'settings.branding', 'settings.registration', 'settings.seo', 'security.view', 'security.edit', 'system.view', 'system.backup');

-- Assign super_admin role to existing admin users
INSERT IGNORE INTO admin_user_roles (user_id, role_id)
  SELECT u.id, r.id FROM users u
  INNER JOIN user_roles ur ON ur.user_id = u.id
  INNER JOIN roles role ON role.id = ur.role_id
  INNER JOIN admin_roles r ON r.name = 'super_admin'
  WHERE role.name IN ('admin', 'super_admin');

-- Default email templates
INSERT INTO email_templates (name, subject, body, variables) VALUES
  ('welcome', 'Welcome to {site_name}',
   "Hello {full_name},\n\nWelcome to {site_name}! Your account has been created successfully.\n\nYou can sign in at: {login_url}\n\nIf you have any questions, contact us at: {support_email}\n\nBest regards,\nThe {site_name} Team",
   '["site_name","full_name","login_url","support_email"]'),
  ('password_reset', 'Reset your {site_name} password',
   "Hello {full_name},\n\nA password reset was requested for your account.\n\nUse this link within one hour:\n{reset_url}\n\nIf you did not request this, ignore this message.\n\nBest regards,\nThe {site_name} Team",
   '["site_name","full_name","reset_url"]'),
  ('support_response', 'Response to your support ticket',
   "Hello {full_name},\n\nYour ticket \"{ticket_subject}\" has received a new response:\n\n{response_body}\n\nView your ticket: {ticket_url}\n\nBest regards,\nThe {site_name} Team",
   '["site_name","full_name","ticket_subject","response_body","ticket_url"]'),
  ('account_status', 'Your {site_name} account status changed',
   "Hello {full_name},\n\nYour account status has been changed to: {new_status}\n\nIf you have any questions, contact us at: {support_email}\n\nBest regards,\nThe {site_name} Team",
   '["site_name","full_name","new_status","support_email"]')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Default content pages
INSERT INTO content_pages (slug, title, body, status) VALUES
  ('terms', 'Terms of Use', '<p>Terms of use content goes here.</p>', 'published'),
  ('privacy', 'Privacy Policy', '<p>Privacy policy content goes here.</p>', 'published'),
  ('rules', 'Rules', '<p>Site rules go here.</p>', 'published')
ON DUPLICATE KEY UPDATE slug = VALUES(slug);

-- Default FAQs
INSERT INTO faqs (question, answer, sort_order, is_active) VALUES
  ('How do I sign up?', 'Click the sign-up button on the homepage and fill in the registration form.', 1, 1),
  ('How do I contact support?', 'Sign in and use the Support page to create a secure request for the support team.', 2, 1),
  ('What are your Terms of Use and Privacy Policy?', 'See the terms and privacy policy pages linked in the footer.', 3, 1)
ON DUPLICATE KEY UPDATE question = VALUES(question);

-- Additional site settings
INSERT INTO site_settings (setting_key, setting_value, value_type, is_public) VALUES
  ('site_name', 'neximatrix', 'text', 1),
  ('site_tagline', 'Secure investment management', 'text', 1),
  ('site_description', 'neximatrix account management platform.', 'text', 1),
  ('meta_title', 'neximatrix - Secure Investment Management', 'text', 1),
  ('meta_description', 'Manage your neximatrix account with secure profile, support, notifications, and activity history.', 'text', 1),
  ('timezone', 'UTC', 'text', 0),
  ('date_format', 'Y-m-d', 'text', 0),
  ('time_format', 'H:i', 'text', 0),
  ('registration_enabled', '1', 'boolean', 0),
  ('registration_email_verification', '1', 'boolean', 0),
  ('maintenance_enabled', '0', 'boolean', 0),
  ('maintenance_message', 'Site is under maintenance. Please check back soon.', 'text', 0),
  ('session_timeout_minutes', '120', 'number', 0),
  ('max_login_attempts', '5', 'number', 0),
  ('lockout_duration_minutes', '30', 'number', 0),
  ('password_min_length', '8', 'number', 0),
  ('password_require_letter', '1', 'boolean', 0),
  ('password_require_number', '1', 'boolean', 0),
  ('facebook_url', '', 'text', 1),
  ('twitter_url', '', 'text', 1),
  ('instagram_url', '', 'text', 1),
  ('linkedin_url', '', 'text', 1),
  ('youtube_url', '', 'text', 1),
  ('footer_copyright', '&copy; 2026 neximatrix. All rights reserved.', 'text', 1),
  ('footer_text', 'Secure account management and support platform.', 'text', 1)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);
