ALTER TABLE client ADD COLUMN archive_batch text;
--> statement-breakpoint
ALTER TABLE project ADD COLUMN archive_batch text;
--> statement-breakpoint
ALTER TABLE board_task ADD COLUMN archive_batch text;
--> statement-breakpoint
CREATE TRIGGER project_active_client_insert BEFORE INSERT ON project
WHEN EXISTS (SELECT 1 FROM client WHERE id = NEW.client_id AND archive_batch IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'Escolha um cliente ativo.');
END;
--> statement-breakpoint
CREATE TRIGGER project_active_client_update BEFORE UPDATE OF client_id ON project
WHEN EXISTS (SELECT 1 FROM client WHERE id = NEW.client_id AND archive_batch IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'Escolha um cliente ativo.');
END;
--> statement-breakpoint
CREATE TRIGGER task_active_project_insert BEFORE INSERT ON board_task
WHEN EXISTS (SELECT 1 FROM project WHERE id = NEW.project_id AND archive_batch IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'Escolha um projeto ativo.');
END;
--> statement-breakpoint
CREATE TRIGGER task_active_project_update BEFORE UPDATE OF project_id ON board_task
WHEN EXISTS (SELECT 1 FROM project WHERE id = NEW.project_id AND archive_batch IS NOT NULL)
BEGIN
  SELECT RAISE(ABORT, 'Escolha um projeto ativo.');
END;
