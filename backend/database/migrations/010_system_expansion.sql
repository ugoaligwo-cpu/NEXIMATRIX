USE neximatrix;

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_name VARCHAR(120) NOT NULL,
  task_description VARCHAR(500) NULL,
  schedule VARCHAR(60) NOT NULL DEFAULT 'daily',
  last_run_at DATETIME NULL,
  next_run_at DATETIME NULL,
  status ENUM('active', 'paused', 'disabled') NOT NULL DEFAULT 'active',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_scheduled_tasks_name (task_name),
  KEY idx_scheduled_tasks_status (is_active)
) ENGINE=InnoDB;

INSERT INTO scheduled_tasks (task_name, task_description, schedule, status, is_active) VALUES
  ('daily_profit', 'Calculate daily profits for active investments', 'daily', 'active', 1),
  ('session_cleanup', 'Clean up expired sessions', 'hourly', 'active', 1),
  ('backup_reminder', 'Remind admin about database backup', 'weekly', 'active', 1)
ON DUPLICATE KEY UPDATE task_name = VALUES(task_name);
