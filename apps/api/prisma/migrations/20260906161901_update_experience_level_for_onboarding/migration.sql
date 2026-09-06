/*
  Warnings:

  - The values [INTERN,FRESHER,JUNIOR,MIDDLE,SENIOR,LEAD] on the enum `experience_level_enum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "experience_level_enum_new" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');
ALTER TABLE "user_preferences" ALTER COLUMN "experience_level" TYPE "experience_level_enum_new" USING ("experience_level"::text::"experience_level_enum_new");
ALTER TYPE "experience_level_enum" RENAME TO "experience_level_enum_old";
ALTER TYPE "experience_level_enum_new" RENAME TO "experience_level_enum";
DROP TYPE "public"."experience_level_enum_old";
COMMIT;
