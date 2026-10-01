import { PrismaClient } from "@prisma/client";
import { seedCurriculum } from "../packages/database/seed";
const db = new PrismaClient();
try {
  await seedCurriculum(db);
  console.log(
    "Sample curriculum seeded (4 skills, 24 exercises). Existing session snapshots preserved.",
  );
} finally {
  await db.$disconnect();
}
