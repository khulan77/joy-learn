-- DropForeignKey
ALTER TABLE "Mastery" DROP CONSTRAINT "Mastery_topicId_fkey";

-- AlterTable
ALTER TABLE "LearningSession" ADD COLUMN     "exerciseId" TEXT,
ADD COLUMN     "practice" JSONB;

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "detectedMistake" TEXT;

-- AlterTable
ALTER TABLE "Mastery" ADD COLUMN     "skillId" TEXT,
ALTER COLUMN "topicId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumExercise" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "CurriculumExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasteryEvent" (
    "id" SERIAL NOT NULL,
    "attemptId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "before" DOUBLE PRECISION NOT NULL,
    "after" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasteryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurriculumExercise_skillId_difficulty_idx" ON "CurriculumExercise"("skillId", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "MasteryEvent_attemptId_key" ON "MasteryEvent"("attemptId");

-- CreateIndex
CREATE INDEX "MasteryEvent_studentId_skillId_id_idx" ON "MasteryEvent"("studentId", "skillId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Mastery_studentId_skillId_key" ON "Mastery"("studentId", "skillId");

-- AddForeignKey
ALTER TABLE "LearningSession" ADD CONSTRAINT "LearningSession_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "CurriculumExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mastery" ADD CONSTRAINT "Mastery_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mastery" ADD CONSTRAINT "Mastery_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumExercise" ADD CONSTRAINT "CurriculumExercise_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryEvent" ADD CONSTRAINT "MasteryEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryEvent" ADD CONSTRAINT "MasteryEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasteryEvent" ADD CONSTRAINT "MasteryEvent_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

