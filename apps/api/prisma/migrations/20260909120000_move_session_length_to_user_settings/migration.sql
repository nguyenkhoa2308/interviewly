-- Consolidate the onboarding session duration into user_settings, which is the
-- canonical source for runtime defaults. Existing onboarding choices win over
-- the old default when both records already exist.
INSERT INTO "user_settings" ("user_id", "default_duration_minutes")
SELECT "user_id", "session_length"
FROM "user_preferences"
WHERE "session_length" IS NOT NULL
ON CONFLICT ("user_id") DO UPDATE
SET "default_duration_minutes" = EXCLUDED."default_duration_minutes";

ALTER TABLE "user_preferences"
DROP COLUMN "session_length";
