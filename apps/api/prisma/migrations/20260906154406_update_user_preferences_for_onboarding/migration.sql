/*
  Warnings:

  - You are about to drop the column `years_of_experience` on the `user_preferences` table. All the data in the column will be lost.
  - The `interview_goals` column on the `user_preferences` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "InterviewGoal" AS ENUM ('GET_A_JOB', 'IMPROVE_SKILLS', 'CRACK_TOP_COMPANIES', 'SWITCH_CAREER', 'BOOST_INTERVIEW_CONFIDENCE', 'IMPROVE_RESUME', 'PRACTICE_COMMUNICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "LearningStyle" AS ENUM ('LEARN_BY_DOING', 'LEARN_BY_READING', 'LEARN_BY_WATCHING', 'MIXED');

-- CreateEnum
CREATE TYPE "ContentPreference" AS ENUM ('DATA_STRUCTURES_ALGORITHMS', 'SYSTEM_DESIGN', 'FRONTEND_FRAMEWORKS', 'BEHAVIORAL_QUESTIONS', 'CODING_CHALLENGES', 'RESUME_PORTFOLIO');

-- CreateEnum
CREATE TYPE "FeedbackDetail" AS ENUM ('CONCISE', 'STANDARD', 'DETAILED');

-- AlterTable
ALTER TABLE "user_preferences" DROP COLUMN "years_of_experience",
ADD COLUMN     "content_preferences" "ContentPreference"[] DEFAULT ARRAY[]::"ContentPreference"[],
ADD COLUMN     "custom_interview_goal" VARCHAR(255),
ADD COLUMN     "feedback_detail" "FeedbackDetail",
ADD COLUMN     "learning_style" "LearningStyle",
ADD COLUMN     "session_length" INTEGER,
DROP COLUMN "interview_goals",
ADD COLUMN     "interview_goals" "InterviewGoal"[] DEFAULT ARRAY[]::"InterviewGoal"[];
