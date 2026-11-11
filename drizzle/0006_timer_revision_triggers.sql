-- A development server may have applied 0005 before the revision triggers
-- were added. Install them without recreating tables or changing records.
CREATE TRIGGER IF NOT EXISTS time_record_start_revision AFTER INSERT ON time_record BEGIN UPDATE timer_state SET version = version + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS time_record_stop_revision AFTER UPDATE OF ended_at ON time_record BEGIN UPDATE timer_state SET version = version + 1 WHERE id = 1; END;
