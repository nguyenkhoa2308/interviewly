CREATE TYPE "InterviewTurnOrigin" AS ENUM ('PLANNED_MAIN', 'ADAPTIVE');
CREATE TYPE "InterviewAdaptiveAction" AS ENUM ('FOLLOW_UP', 'REPHRASE', 'INCREASE_DEPTH', 'DECREASE_DEPTH', 'CHANGE_TOPIC');
CREATE TYPE "InterviewAssistanceLevel" AS ENUM ('NONE', 'REPHRASE', 'SIMPLIFIED', 'LIGHT_HINT');
CREATE TYPE "InterviewAdaptiveStatus" AS ENUM ('IDLE', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TABLE "interview_turns"
    ADD COLUMN "runtime_order" INTEGER,
    ADD COLUMN "root_planned_question_key" VARCHAR(100),
    ADD COLUMN "parent_turn_id" UUID,
    ADD COLUMN "origin" "InterviewTurnOrigin" NOT NULL DEFAULT 'PLANNED_MAIN',
    ADD COLUMN "adaptive_action" "InterviewAdaptiveAction",
    ADD COLUMN "assistance_level" "InterviewAssistanceLevel" NOT NULL DEFAULT 'NONE',
    ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "topic" VARCHAR(150),
    ADD COLUMN "difficulty" "difficulty_enum",
    ADD COLUMN "answer_assessment" JSONB,
    ADD COLUMN "decision_reason" TEXT,
    ADD COLUMN "adaptive_status" "InterviewAdaptiveStatus" NOT NULL DEFAULT 'IDLE',
    ADD COLUMN "adaptive_processed_at" TIMESTAMPTZ(6),
    ADD COLUMN "model_provider" VARCHAR(100),
    ADD COLUMN "model_name" VARCHAR(150),
    ADD COLUMN "prompt_version" VARCHAR(50);

UPDATE "interview_turns"
SET "runtime_order" = "ordinal" * 100,
    "root_planned_question_key" = "planned_question_key";

ALTER TABLE "interview_turns"
    ALTER COLUMN "runtime_order" SET NOT NULL,
    ALTER COLUMN "root_planned_question_key" SET NOT NULL,
    ALTER COLUMN "ordinal" DROP NOT NULL;

DROP INDEX "interview_turns_session_id_answered_at_ordinal_idx";

CREATE UNIQUE INDEX "interview_turns_parent_turn_id_key" ON "interview_turns"("parent_turn_id");
CREATE UNIQUE INDEX "interview_turns_session_id_runtime_order_key" ON "interview_turns"("session_id", "runtime_order");
CREATE INDEX "interview_turns_session_id_answered_at_runtime_order_idx" ON "interview_turns"("session_id", "answered_at", "runtime_order");
CREATE INDEX "interview_turns_session_id_root_planned_question_key_idx" ON "interview_turns"("session_id", "root_planned_question_key");
CREATE INDEX "interview_turns_adaptive_status_answered_at_idx" ON "interview_turns"("adaptive_status", "answered_at");

ALTER TABLE "interview_turns"
    ADD CONSTRAINT "interview_turns_parent_turn_id_fkey"
    FOREIGN KEY ("parent_turn_id") REFERENCES "interview_turns"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;