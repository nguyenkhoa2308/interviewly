CREATE TYPE "jd_analysis_status_enum" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "job_descriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "company" VARCHAR(150),
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "jd_analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_description_id" UUID NOT NULL,
    "status" "jd_analysis_status_enum" NOT NULL DEFAULT 'PROCESSING',
    "detected_role" VARCHAR(150),
    "seniority" VARCHAR(100),
    "summary" TEXT,
    "required_skills" JSONB,
    "preferred_skills" JSONB,
    "responsibilities" JSONB,
    "requirements" JSONB,
    "keywords" JSONB,
    "interview_focus" JSONB,
    "insights" JSONB,
    "model_provider" VARCHAR(100),
    "model_name" VARCHAR(150),
    "prompt_version" VARCHAR(50),
    "error_code" VARCHAR(100),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    CONSTRAINT "jd_analyses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "job_descriptions_user_id_deleted_at_created_at_idx"
ON "job_descriptions"("user_id", "deleted_at", "created_at" DESC);

CREATE INDEX "jd_analyses_job_description_id_created_at_idx"
ON "jd_analyses"("job_description_id", "created_at" DESC);

CREATE INDEX "jd_analyses_job_description_id_status_idx"
ON "jd_analyses"("job_description_id", "status");

CREATE UNIQUE INDEX "jd_analyses_one_processing_per_jd"
ON "jd_analyses"("job_description_id")
WHERE "status" = 'PROCESSING';

ALTER TABLE "job_descriptions"
ADD CONSTRAINT "job_descriptions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "jd_analyses"
ADD CONSTRAINT "jd_analyses_job_description_id_fkey"
FOREIGN KEY ("job_description_id") REFERENCES "job_descriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
