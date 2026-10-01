import { PrismaClient, Prisma } from "@prisma/client";
import { skills, sampleExercises } from "../curriculum/sample";
export async function seedCurriculum(db: PrismaClient) {
  await db.$transaction(async (tx) => {
    await tx.subject.createMany({
      data: [{ id: "math", name: "Математик" }],
      skipDuplicates: true,
    });
    for (const s of skills) {
      await tx.topic.createMany({
        data: [{ id: s.topicId, name: s.topic, grade: 3, subjectId: "math" }],
        skipDuplicates: true,
      });
      await tx.skill.createMany({
        data: [
          { id: s.id, name: s.name, concept: s.concept, topicId: s.topicId },
        ],
        skipDuplicates: true,
      });
    }
    for (const e of sampleExercises) {
      const content = JSON.parse(JSON.stringify(e)) as Prisma.InputJsonValue;
      // Refresh development samples; existing sessions retain their original snapshots.
      await tx.curriculumExercise.upsert({
        where: { id: e.id },
        create: {
          id: e.id,
          skillId: e.skillId,
          difficulty: e.difficulty,
          version: e.version,
          source: e.source,
          content,
        },
        update: { content },
      });
    }
  });
}
