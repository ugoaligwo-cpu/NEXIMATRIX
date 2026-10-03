USE neximatrix;

ALTER TABLE support_tickets ADD COLUMN assigned_to BIGINT UNSIGNED NULL AFTER user_id;
ALTER TABLE support_tickets ADD CONSTRAINT fk_support_tickets_assignee FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE support_tickets ADD KEY idx_support_tickets_assignee (assigned_to);
