CREATE TABLE "interview_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "interview_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interview_turns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "planned_question_key" VARCHAR(100) NOT NULL,
    "section_index" INTEGER NOT NULL,
    "section_title" VARCHAR(150) NOT NULL,
    "question_type" VARCHAR(50) NOT NULL,
    "question_text" TEXT NOT NULL,
    "answer_text" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMPTZ(6),
    CONSTRAINT "interview_turns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "interview_sessions_interview_id_key" ON "interview_sessions"("interview_id");
CREATE UNIQUE INDEX "interview_sessions_plan_id_key" ON "interview_sessions"("plan_id");
CREATE INDEX "interview_sessions_interview_id_completed_at_idx" ON "interview_sessions"("interview_id", "completed_at");
CREATE UNIQUE INDEX "interview_turns_session_id_ordinal_key" ON "interview_turns"("session_id", "ordinal");
CREATE UNIQUE INDEX "interview_turns_session_id_planned_question_key_key" ON "interview_turns"("session_id", "planned_question_key");
CREATE INDEX "interview_turns_session_id_answered_at_ordinal_idx" ON "interview_turns"("session_id", "answered_at", "ordinal");

ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "interview_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interview_turns" ADD CONSTRAINT "interview_turns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;