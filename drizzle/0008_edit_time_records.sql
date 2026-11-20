ALTER TABLE time_record ADD COLUMN version integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE time_record ADD COLUMN manual integer NOT NULL DEFAULT 0;
--> statement-breakpoint
DROP TRIGGER time_record_switch;
--> statement-breakpoint
CREATE TRIGGER time_record_switch BEFORE INSERT ON time_record
WHEN NEW.ended_at IS NULL AND NEW.task_id IS NOT NULL
BEGIN
  UPDATE time_record SET ended_at = NEW.started_at WHERE ended_at IS NULL;
END;
--> statement-breakpoint
DROP TRIGGER time_record_start_revision;
--> statement-breakpoint
-- A completed manual record changes the history without changing the timer.
CREATE TRIGGER time_record_start_revision AFTER INSERT ON time_record
WHEN NEW.ended_at IS NULL
BEGIN
  UPDATE timer_state SET version = version + 1 WHERE id = 1;
END;
--> statement-breakpoint
DROP TRIGGER time_record_stop_revision;
--> statement-breakpoint
-- The most recent timed period is also the source for the resume command.
CREATE TRIGGER time_record_stop_revision AFTER UPDATE OF ended_at ON time_record
WHEN OLD.ended_at IS NULL OR (
  OLD.manual = 0
  AND (NEW.description IS NOT OLD.description OR NEW.task_id IS NOT OLD.task_id
       OR NEW.project_id IS NOT OLD.project_id OR NEW.client_id IS NOT OLD.client_id)
  AND OLD.id = (SELECT max(id) FROM time_record WHERE manual = 0)
)
BEGIN
  UPDATE timer_state SET version = version + 1 WHERE id = 1;
END;
