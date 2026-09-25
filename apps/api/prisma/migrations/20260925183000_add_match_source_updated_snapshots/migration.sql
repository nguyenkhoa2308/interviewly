ALTER TABLE "cv_jd_matches"
ADD COLUMN "cv_updated_at_snapshot" TIMESTAMPTZ(6),
ADD COLUMN "jd_updated_at_snapshot" TIMESTAMPTZ(6);

UPDATE "cv_jd_matches" AS "match"
SET
    "cv_updated_at_snapshot" = "cv"."updated_at",
    "jd_updated_at_snapshot" = "jd"."updated_at"
FROM "cvs" AS "cv", "job_descriptions" AS "jd"
WHERE "match"."cv_id" = "cv"."id"
  AND "match"."job_description_id" = "jd"."id";

ALTER TABLE "cv_jd_matches"
ALTER COLUMN "cv_updated_at_snapshot" SET NOT NULL,
ALTER COLUMN "jd_updated_at_snapshot" SET NOT NULL;