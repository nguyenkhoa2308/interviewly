ALTER TABLE "interview_evaluations"
    ADD COLUMN "question_review_status" "interview_evaluation_status_enum" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN "question_review_data" JSONB,
    ADD COLUMN "question_review_error_code" VARCHAR(100),
    ADD COLUMN "question_review_error_message" TEXT,
    ADD COLUMN "question_review_attempt_count" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "question_review_processing_at" TIMESTAMPTZ(6),
    ADD COLUMN "question_review_completed_at" TIMESTAMPTZ(6);

-- Existing completed reports already contain usable answerReviews. Backfill the
-- split-stage payload so old reports remain immediately readable.
UPDATE "interview_evaluations"
SET
    "question_review_status" = 'COMPLETED',
    "question_review_data" = jsonb_build_object(
        'schemaVersion', 1,
        'answerReviews', COALESCE("report_data"->'answerReviews', '[]'::jsonb)
    ),
    "question_review_completed_at" = COALESCE("completed_at", "updated_at")
WHERE "report_data" IS NOT NULL
  AND jsonb_typeof("report_data"->'answerReviews') = 'array';

CREATE INDEX "interview_evaluations_question_review_status_processing_at_idx"
ON "interview_evaluations"("question_review_status", "question_review_processing_at");