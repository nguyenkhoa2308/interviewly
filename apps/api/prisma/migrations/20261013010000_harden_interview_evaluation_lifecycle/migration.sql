ALTER TABLE "interview_evaluations"
ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "interview_evaluations"
ADD CONSTRAINT "interview_evaluations_attempt_count_check"
CHECK ("attempt_count" >= 0 AND "attempt_count" <= 3);