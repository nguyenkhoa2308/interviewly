-- DropForeignKey
ALTER TABLE "interview_sessions" DROP CONSTRAINT "interview_sessions_plan_id_fkey";

-- AddForeignKey
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "interview_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
