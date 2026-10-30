CREATE TYPE "interview_evaluation_status_enum" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "evaluation_confidence_enum" AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "evaluation_level_assessment_enum" AS ENUM ('ABOVE_EXPECTATIONS', 'MEETS_EXPECTATIONS', 'PARTIALLY_MEETS_EXPECTATIONS', 'BELOW_EXPECTATIONS', 'INSUFFICIENT_EVIDENCE');

CREATE TABLE "interview_evaluations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "status" "interview_evaluation_status_enum" NOT NULL DEFAULT 'PENDING',
    "rubric_version" VARCHAR(50) NOT NULL DEFAULT 'evaluation-v1',
    "overall_score" DECIMAL(4,2),
    "coverage" DECIMAL(5,4),
    "confidence" "evaluation_confidence_enum",
    "level_assessment" "evaluation_level_assessment_enum",
    "report_data" JSONB,
    "model_provider" VARCHAR(100),
    "model_name" VARCHAR(150),
    "prompt_version" VARCHAR(50),
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "processing_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interview_evaluations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "interview_evaluations_score_check" CHECK ("overall_score" IS NULL OR ("overall_score" >= 0 AND "overall_score" <= 10)),
    CONSTRAINT "interview_evaluations_coverage_check" CHECK ("coverage" IS NULL OR ("coverage" >= 0 AND "coverage" <= 1))
);

CREATE UNIQUE INDEX "interview_evaluations_interview_id_key" ON "interview_evaluations"("interview_id");
CREATE UNIQUE INDEX "interview_evaluations_session_id_key" ON "interview_evaluations"("session_id");
CREATE INDEX "interview_evaluations_status_processing_at_idx" ON "interview_evaluations"("status", "processing_at");

ALTER TABLE "interview_evaluations" ADD CONSTRAINT "interview_evaluations_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_evaluations" ADD CONSTRAINT "interview_evaluations_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
