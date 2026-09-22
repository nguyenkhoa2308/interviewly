-- Expand phase for versioned CV files.
-- Legacy file columns on cvs and cv_analyses.cv_id intentionally remain until
-- the application has fully moved to version-aware reads and writes.

ALTER TABLE "cvs"
ADD COLUMN "current_version_id" UUID;

CREATE TABLE "cv_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cv_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "original_filename" VARCHAR(255) NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER,
    "extracted_text" TEXT,
    "structured_content" JSONB,
    "processing_status" "cv_processing_status_enum" NOT NULL DEFAULT 'UPLOADING',
    "processing_error_code" VARCHAR(100),
    "processing_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cv_versions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cv_analyses"
ADD COLUMN "cv_version_id" UUID;

INSERT INTO "cv_versions" (
    "cv_id",
    "version_number",
    "original_filename",
    "storage_key",
    "mime_type",
    "file_size",
    "extracted_text",
    "structured_content",
    "processing_status",
    "processing_error_code",
    "processing_error",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    1,
    "original_filename",
    "storage_key",
    "mime_type",
    "file_size",
    "extracted_text",
    "structured_content",
    "processing_status",
    "processing_error_code",
    "processing_error",
    "created_at",
    "updated_at"
FROM "cvs";

UPDATE "cvs" AS cv
SET "current_version_id" = version."id"
FROM "cv_versions" AS version
WHERE version."cv_id" = cv."id"
  AND version."version_number" = 1;

UPDATE "cv_analyses" AS analysis
SET "cv_version_id" = version."id"
FROM "cv_versions" AS version
WHERE version."cv_id" = analysis."cv_id"
  AND version."version_number" = 1;

CREATE UNIQUE INDEX "cvs_current_version_id_key"
ON "cvs"("current_version_id");

CREATE UNIQUE INDEX "cv_versions_storage_key_key"
ON "cv_versions"("storage_key");

CREATE UNIQUE INDEX "cv_versions_cv_id_version_number_key"
ON "cv_versions"("cv_id", "version_number");

CREATE INDEX "cv_versions_cv_id_created_at_idx"
ON "cv_versions"("cv_id", "created_at" DESC);

CREATE INDEX "cv_versions_cv_id_processing_status_idx"
ON "cv_versions"("cv_id", "processing_status");

CREATE INDEX "cv_analyses_cv_version_id_created_at_idx"
ON "cv_analyses"("cv_version_id", "created_at" DESC);

CREATE INDEX "cv_analyses_cv_version_id_status_idx"
ON "cv_analyses"("cv_version_id", "status");

ALTER TABLE "cv_versions"
ADD CONSTRAINT "cv_versions_cv_id_fkey"
FOREIGN KEY ("cv_id") REFERENCES "cvs"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cvs"
ADD CONSTRAINT "cvs_current_version_id_fkey"
FOREIGN KEY ("current_version_id") REFERENCES "cv_versions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cv_analyses"
ADD CONSTRAINT "cv_analyses_cv_version_id_fkey"
FOREIGN KEY ("cv_version_id") REFERENCES "cv_versions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
