CREATE TYPE "InterviewPlannedQuestionStatus" AS ENUM ('PENDING', 'ASKED', 'COVERED_INDIRECTLY', 'SKIPPED_REDUNDANT', 'UNUSED');
CREATE TYPE "InterviewProbeType" AS ENUM ('MAIN_TARGET_LEVEL', 'SAME_LEVEL_PROBE', 'STRETCH_PROBE');
CREATE TYPE "InterviewScoringImpact" AS ENUM ('TARGET_LEVEL', 'BONUS_ONLY');

ALTER TABLE "interview_turns"
    ADD COLUMN "planned_status" "InterviewPlannedQuestionStatus",
    ADD COLUMN "probe_type" "InterviewProbeType" NOT NULL DEFAULT 'MAIN_TARGET_LEVEL',
    ADD COLUMN "question_level" "experience_level_enum",
    ADD COLUMN "scoring_impact" "InterviewScoringImpact" NOT NULL DEFAULT 'TARGET_LEVEL',
    ADD COLUMN "coverage_evidence" JSONB,
    ADD COLUMN "disposition_reason" TEXT,
    ADD COLUMN "covered_by_turn_id" UUID;

UPDATE "interview_turns"
SET "planned_status" = CASE
        WHEN "answered_at" IS NOT NULL THEN 'ASKED'::"InterviewPlannedQuestionStatus"
        ELSE 'PENDING'::"InterviewPlannedQuestionStatus"
    END
WHERE "origin" = 'PLANNED_MAIN';

-- Preserve the exact question that was visible when an existing session is migrated.
WITH first_pending AS (
    SELECT DISTINCT ON ("session_id") "id"
    FROM "interview_turns"
    WHERE "origin" = 'PLANNED_MAIN'
      AND "planned_status" = 'PENDING'
    ORDER BY "session_id", "runtime_order"
)
UPDATE "interview_turns"
SET "planned_status" = 'ASKED'
WHERE "id" IN (SELECT "id" FROM first_pending);

UPDATE "interview_turns" AS turn
SET "question_level" = interview."target_level"
FROM "interview_sessions" AS session
JOIN "interviews" AS interview ON interview."id" = session."interview_id"
WHERE turn."session_id" = session."id";

UPDATE "interview_turns"
SET "probe_type" = 'SAME_LEVEL_PROBE'
WHERE "origin" = 'ADAPTIVE';

CREATE INDEX "interview_turns_session_id_planned_status_runtime_order_idx"
ON "interview_turns"("session_id", "planned_status", "runtime_order");

ALTER TABLE "interview_turns"
    ADD CONSTRAINT "interview_turns_covered_by_turn_id_fkey"
    FOREIGN KEY ("covered_by_turn_id") REFERENCES "interview_turns"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;