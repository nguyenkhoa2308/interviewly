-- CreateEnum
CREATE TYPE "experience_level_enum" AS ENUM ('INTERN', 'FRESHER', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "language_enum" AS ENUM ('VI', 'EN');

-- CreateEnum
CREATE TYPE "interview_type_enum" AS ENUM ('HR', 'BEHAVIORAL', 'TECHNICAL', 'CODING', 'SYSTEM_DESIGN', 'FULL');

-- CreateEnum
CREATE TYPE "difficulty_enum" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'ADAPTIVE');

-- CreateEnum
CREATE TYPE "interviewer_style_enum" AS ENUM ('FRIENDLY', 'PROFESSIONAL', 'STRICT');

-- CreateEnum
CREATE TYPE "skill_level_enum" AS ENUM ('BEGINNER', 'BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "theme_enum" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "interaction_mode_enum" AS ENUM ('TEXT', 'VOICE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT,
    "full_name" VARCHAR(150) NOT NULL,
    "avatar_url" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_account_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "target_role" VARCHAR(100),
    "experience_level" "experience_level_enum",
    "years_of_experience" DECIMAL(4,1),
    "preferred_language" "language_enum" NOT NULL DEFAULT 'VI',
    "default_interview_type" "interview_type_enum",
    "default_difficulty" "difficulty_enum",
    "interviewer_style" "interviewer_style_enum",
    "interview_goals" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "theme" "theme_enum" NOT NULL DEFAULT 'SYSTEM',
    "timezone" VARCHAR(100),
    "default_interaction_mode" "interaction_mode_enum" NOT NULL DEFAULT 'TEXT',
    "default_duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "voice_name" VARCHAR(100),
    "speech_speed" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "volume" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "save_interview_audio" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "category" VARCHAR(100),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_skills" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "self_level" "skill_level_enum",
    "years_of_experience" DECIMAL(4,1),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE INDEX "skills_is_active_idx" ON "skills"("is_active");

-- CreateIndex
CREATE INDEX "user_skills_skill_id_idx" ON "user_skills"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_user_id_skill_id_key" ON "user_skills"("user_id", "skill_id");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "user_preferences"
ADD CONSTRAINT "user_preferences_years_of_experience_check"
CHECK ("years_of_experience" IS NULL OR "years_of_experience" >= 0);

-- AddCheckConstraint
ALTER TABLE "user_skills"
ADD CONSTRAINT "user_skills_years_of_experience_check"
CHECK ("years_of_experience" IS NULL OR "years_of_experience" >= 0);

-- AddCheckConstraint
ALTER TABLE "user_settings"
ADD CONSTRAINT "user_settings_default_duration_minutes_check"
CHECK ("default_duration_minutes" > 0);

-- AddCheckConstraint
ALTER TABLE "user_settings"
ADD CONSTRAINT "user_settings_speech_speed_check"
CHECK ("speech_speed" > 0);

-- AddCheckConstraint
ALTER TABLE "user_settings"
ADD CONSTRAINT "user_settings_volume_check"
CHECK ("volume" >= 0 AND "volume" <= 1);
