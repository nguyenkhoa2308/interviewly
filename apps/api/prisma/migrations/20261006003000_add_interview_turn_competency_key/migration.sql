ALTER TABLE "interview_turns"
ADD COLUMN "competency_key" VARCHAR(100);

CREATE INDEX "interview_turns_session_id_competency_key_idx"
ON "interview_turns"("session_id", "competency_key");