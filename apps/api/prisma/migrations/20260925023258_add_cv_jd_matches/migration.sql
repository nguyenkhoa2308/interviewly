-- CreateEnum
CREATE TYPE "cv_jd_match_status_enum" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "cv_jd_matches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "cv_id" UUID NOT NULL,
    "cv_version_id" UUID NOT NULL,
    "cv_analysis_id" UUID NOT NULL,
    "job_description_id" UUID NOT NULL,
    "jd_analysis_id" UUID NOT NULL,
    "status" "cv_jd_match_status_enum" NOT NULL DEFAULT 'PROCESSING',
    "cv_name_snapshot" VARCHAR(150) NOT NULL,
    "cv_version_number" INTEGER NOT NULL,
    "jd_title_snapshot" VARCHAR(150) NOT NULL,
    "jd_company_snapshot" VARCHAR(150),
    "match_score" DECIMAL(5,2),
    "match_summary" TEXT,
    "matched_skills" JSONB,
    "skill_gaps" JSONB,
    "strengths" JSONB,
    "gaps" JSONB,
    "experience_alignment" JSONB,
    "recommendations" JSONB,
    "model_provider" VARCHAR(100),
    "model_name" VARCHAR(150),
    "prompt_version" VARCHAR(50),
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "cv_jd_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cv_jd_matches_user_id_created_at_idx" ON "cv_jd_matches"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cv_jd_matches_user_id_cv_id_job_description_id_created_at_idx" ON "cv_jd_matches"("user_id", "cv_id", "job_description_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cv_jd_matches_cv_analysis_id_jd_analysis_id_status_idx" ON "cv_jd_matches"("cv_analysis_id", "jd_analysis_id", "status");

-- AddForeignKey
ALTER TABLE "cv_jd_matches" ADD CONSTRAINT "cv_jd_matches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_jd_matches" ADD CONSTRAINT "cv_jd_matches_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_jd_matches" ADD CONSTRAINT "cv_jd_matches_cv_version_id_fkey" FOREIGN KEY ("cv_version_id") REFERENCES "cv_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_jd_matches" ADD CONSTRAINT "cv_jd_matches_cv_analysis_id_fkey" FOREIGN KEY ("cv_analysis_id") REFERENCES "cv_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_jd_matches" ADD CONSTRAINT "cv_jd_matches_job_description_id_fkey" FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_jd_matches" ADD CONSTRAINT "cv_jd_matches_jd_analysis_id_fkey" FOREIGN KEY ("jd_analysis_id") REFERENCES "jd_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce score bounds and one in-flight match for the same immutable inputs.
ALTER TABLE "cv_jd_matches" ADD CONSTRAINT "cv_jd_matches_score_range_check" CHECK ("match_score" IS NULL OR ("match_score" >= 0 AND "match_score" <= 100));

CREATE UNIQUE INDEX "cv_jd_matches_one_processing_per_inputs"
ON "cv_jd_matches" ("cv_analysis_id", "jd_analysis_id")
WHERE "status" = 'PROCESSING';
