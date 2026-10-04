-- CreateEnum
CREATE TYPE "interview_status_enum" AS ENUM ('PLANNING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "interview_plan_status_enum" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "cv_id" UUID NOT NULL,
    "cv_version_id" UUID NOT NULL,
    "cv_analysis_id" UUID NOT NULL,
    "job_description_id" UUID NOT NULL,
    "jd_analysis_id" UUID NOT NULL,
    "cv_jd_match_id" UUID,
    "status" "interview_status_enum" NOT NULL DEFAULT 'PLANNING',
    "interview_type" "interview_type_enum" NOT NULL,
    "difficulty" "difficulty_enum" NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "question_count" INTEGER NOT NULL,
    "focus_areas" JSONB NOT NULL,
    "target_role" VARCHAR(150) NOT NULL,
    "target_level" "experience_level_enum",
    "source_context_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "interview_plan_status_enum" NOT NULL DEFAULT 'PROCESSING',
    "summary" TEXT,
    "plan_data" JSONB,
    "model_provider" VARCHAR(100),
    "model_name" VARCHAR(150),
    "prompt_version" VARCHAR(50),
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "interview_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interviews_user_id_created_at_idx" ON "interviews"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "interviews_user_id_status_idx" ON "interviews"("user_id", "status");

-- CreateIndex
CREATE INDEX "interview_plans_interview_id_created_at_idx" ON "interview_plans"("interview_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "interview_plans_interview_id_status_idx" ON "interview_plans"("interview_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "interview_plans_interview_id_version_key" ON "interview_plans"("interview_id", "version");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_cv_version_id_fkey" FOREIGN KEY ("cv_version_id") REFERENCES "cv_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_cv_analysis_id_fkey" FOREIGN KEY ("cv_analysis_id") REFERENCES "cv_analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_job_description_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_jd_analysis_id_fkey" FOREIGN KEY ("jd_analysis_id") REFERENCES "jd_analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_cv_jd_match_id_fkey" FOREIGN KEY ("cv_jd_match_id") REFERENCES "cv_jd_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_plans" ADD CONSTRAINT "interview_plans_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce configuration invariants and one active planning attempt per interview.
ALTER TABLE "interviews"
  ADD CONSTRAINT "interviews_duration_minutes_check" CHECK ("duration_minutes" IN (15, 30, 45, 60)),
  ADD CONSTRAINT "interviews_question_count_check" CHECK ("question_count" BETWEEN 3 AND 30);

CREATE UNIQUE INDEX "interview_plans_one_processing_per_interview"
ON "interview_plans" ("interview_id")
WHERE "status" = 'PROCESSING';
