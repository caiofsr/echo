ALTER TABLE time_record ADD COLUMN task_id integer REFERENCES board_task(id);
--> statement-breakpoint
ALTER TABLE time_record ADD COLUMN project_id integer REFERENCES project(id);
--> statement-breakpoint
ALTER TABLE time_record ADD COLUMN client_id integer REFERENCES client(id);
--> statement-breakpoint
ALTER TABLE time_record ADD COLUMN description text;
--> statement-breakpoint
CREATE TRIGGER time_record_switch BEFORE INSERT ON time_record
WHEN NEW.task_id IS NOT NULL
BEGIN
  UPDATE time_record SET ended_at = NEW.started_at WHERE ended_at IS NULL;
END;
