-- Prevent concurrent analysis requests from creating more than one active run
-- for the same CV. The service layer should still return a user-friendly 409.
CREATE UNIQUE INDEX "cv_analyses_one_processing_per_cv"
ON "cv_analyses" ("cv_id")
WHERE "status" = 'PROCESSING';
