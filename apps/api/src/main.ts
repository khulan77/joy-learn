import "reflect-metadata";
import {
  Body,
  Injectable,
  type OnModuleDestroy,
  Controller,
  Get,
  Headers,
  HttpException,
  Module,
  Param,
  Post,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { json } from "express";
import { TutorError, TutorService } from "../../../packages/ai-tutor";
import {
  repository,
  PersistenceConflictError,
} from "../../../packages/database";
import { skills } from "../../../packages/curriculum/sample";
import {
  masteryConfig,
  startPractice,
  respondPractice,
  practiceView,
  progressView,
} from "../../../packages/learning-engine";
import { createExercise } from "../../../packages/curriculum";
import type { Session } from "../../../packages/shared";
const store = repository();
const tutor = new TutorService();
function student(value?: string) {
  if (!value || !/^[0-9a-f-]{36}$/.test(value))
    throw new HttpException("Student token required", 401);
  return value;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new HttpException("Invalid request", 400);
  return value as Record<string, unknown>;
}
function view(s: Session) {
  return {
    ...s,
    totalSteps: createExercise(s.problem)!.steps.length,
    storage: store.mode,
  };
}
async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof PersistenceConflictError)
      throw new HttpException(
        "Хичээл шинэчлэгдсэн байна. Хуудсаа дахин ачаалаарай.",
        409,
      );
    if (e instanceof TutorError) throw new HttpException(e.message, e.status);
    throw e;
  }
}
@Controller("sessions")
class SessionsController {
  @Post()
  async create(@Headers("x-student-id") token: string, @Body() body: unknown) {
    const owner = student(token),
      data = object(body);
    if (typeof data.problem !== "string" || data.problem.length > 200)
      throw new HttpException("Invalid problem", 400);
    return run(async () => {
      const s = tutor.start(data.problem as string, owner);
      await store.save(s);
      return view(s);
    });
  }
  @Get(":id")
  async get(@Headers("x-student-id") token: string, @Param("id") id: string) {
    const owner = student(token),
      s = await store.get(id);
    if (!s || s.practice || s.studentId !== owner)
      throw new HttpException("Хичээл олдсонгүй.", 404);
    return view(s);
  }
  @Post(":id/turns")
  async turn(
    @Headers("x-student-id") token: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const owner = student(token),
      data = object(body);
    if (
      !Number.isInteger(data.version) ||
      (data.hint !== true && typeof data.answer !== "string")
    )
      throw new HttpException("Invalid turn", 400);
    return run(async () => {
      const s = await store.get(id);
      if (!s || s.practice || s.studentId !== owner)
        throw new HttpException("Хичээл олдсонгүй.", 404);
      if (data.version !== s.version)
        throw new TutorError("Хуудсаа дахин ачаалаарай.", 409);
      const next = tutor.respond(s, {
        answer: typeof data.answer === "string" ? data.answer : undefined,
        hint: data.hint === true,
      });
      await store.save(next, s.version);
      return view(next);
    });
  }
}
@Controller()
class PracticeController {
  @Get("curriculum")
  async curriculum() {
    const exercises = await store.curriculum();
    return {
      grade: 3,
      subject: "math",
      source: "sample",
      skills: skills.map((skill) => ({
        ...skill,
        exerciseCount: exercises.filter((e) => e.skillId === skill.id).length,
      })),
    };
  }
  @Get("progress")
  async progress(@Headers("x-student-id") token: string) {
    const owner = student(token);
    return progressView(
      await store.practiceSessions(owner),
      await store.masteryHistory(owner),
      store.mode,
    );
  }
  @Post("practice")
  async start(@Headers("x-student-id") token: string, @Body() body: unknown) {
    const owner = student(token),
      data = object(body);
    if (data.skillId !== undefined && typeof data.skillId !== "string")
      throw new HttpException("Invalid skill", 400);
    return run(async () => {
      const sessions = await store.practiceSessions(owner);
      const progress = progressView(
        sessions,
        await store.masteryHistory(owner),
        store.mode,
      );
      const skillId =
        typeof data.skillId === "string"
          ? data.skillId
          : progress.recommendedSkillId;
      const score =
        progress.skills.find((s) => s.skill.id === skillId)?.score ??
        masteryConfig.initial;
      const session = startPractice(
        owner,
        skillId,
        score,
        sessions.filter((s) => s.practice?.skill.id === skillId),
        await store.curriculum(),
      );
      await store.save(session);
      return practiceView(session, store.mode);
    });
  }
  @Get("practice/resume")
  async resume(@Headers("x-student-id") token: string) {
    const sessions = await store.practiceSessions(student(token));
    const last = sessions.at(-1);
    return last ? practiceView(last, store.mode) : null;
  }
  @Get("practice/:id")
  async get(@Headers("x-student-id") token: string, @Param("id") id: string) {
    const owner = student(token),
      s = await store.get(id);
    if (!s?.practice || s.studentId !== owner)
      throw new HttpException("Дасгал олдсонгүй.", 404);
    return practiceView(s, store.mode);
  }
  @Post("practice/:id/turns")
  async turn(
    @Headers("x-student-id") token: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const owner = student(token),
      data = object(body);
    if (
      !Number.isInteger(data.version) ||
      (data.hint !== true && typeof data.answer !== "string")
    )
      throw new HttpException("Invalid turn", 400);
    return run(async () => {
      const s = await store.get(id);
      if (!s?.practice || s.studentId !== owner)
        throw new HttpException("Дасгал олдсонгүй.", 404);
      if (s.version !== data.version) throw new PersistenceConflictError();
      const next = respondPractice(s, {
        hint: data.hint === true,
        answer: typeof data.answer === "string" ? data.answer : undefined,
      });
      await store.save(next, s.version);
      return practiceView(next, store.mode);
    });
  }
}
@Injectable()
class StorageLifecycle implements OnModuleDestroy {
  async onModuleDestroy() {
    await store.disconnect();
  }
}
@Module({
  controllers: [SessionsController, PracticeController],
  providers: [StorageLifecycle],
})
class AppModule {}
async function bootstrap() {
  await store.connect();
  console.log(`Session storage: ${store.mode}`);
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "8kb" }));
  app.enableShutdownHooks();
  await app.listen(Number(process.env.API_PORT ?? 3001), "127.0.0.1");
}
void bootstrap().catch(async () => {
  console.error(
    "API startup failed. Check the configured storage, database availability, migrations and API port.",
  );
  await store.disconnect();
  process.exitCode = 1;
});
