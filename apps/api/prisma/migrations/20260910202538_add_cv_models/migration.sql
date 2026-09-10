-- CreateEnum
CREATE TYPE "cv_processing_status_enum" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "cv_analysis_status_enum" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "cvs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER,
    "extracted_text" TEXT,
    "processing_status" "cv_processing_status_enum" NOT NULL DEFAULT 'UPLOADING',
    "processing_error_code" VARCHAR(100),
    "processing_error" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "cvs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "status" "cv_analysis_status_enum" NOT NULL DEFAULT 'PROCESSING',
    "overall_score" DECIMAL(5,2),
    "detected_role" VARCHAR(150),
    "detected_level" "experience_level_enum",
    "extracted_skills" JSONB,
    "work_experiences" JSONB,
    "projects" JSONB,
    "education" JSONB,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "interview_risks" JSONB,
    "potential_questions" JSONB,
    "suggestions" JSONB,
    "model_provider" VARCHAR(100),
    "model_name" VARCHAR(150),
    "prompt_version" VARCHAR(50),
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "cv_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cvs_storage_key_key" ON "cvs"("storage_key");

-- CreateIndex
CREATE INDEX "cvs_user_id_deleted_at_idx" ON "cvs"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "cvs_user_id_processing_status_idx" ON "cvs"("user_id", "processing_status");

-- Enforce at most one non-deleted default CV per user.
CREATE UNIQUE INDEX "cvs_one_active_default_per_user"
ON "cvs" ("user_id")
WHERE "is_default" = true
  AND "deleted_at" IS NULL;

-- CreateIndex
CREATE INDEX "cv_analyses_cv_id_created_at_idx" ON "cv_analyses"("cv_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "cv_analyses_cv_id_status_idx" ON "cv_analyses"("cv_id", "status");

-- AddForeignKey
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_analyses" ADD CONSTRAINT "cv_analyses_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cvs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Analysis scores are percentages and must stay within their canonical range.
ALTER TABLE "cv_analyses"
ADD CONSTRAINT "cv_analyses_overall_score_check"
CHECK (
    "overall_score" IS NULL
    OR "overall_score" BETWEEN 0 AND 100
);
