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
    if (!s || s.studentId !== owner)
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
      if (!s || s.studentId !== owner)
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
@Injectable()
class StorageLifecycle implements OnModuleDestroy {
  async onModuleDestroy() {
    await store.disconnect();
  }
}
@Module({ controllers: [SessionsController], providers: [StorageLifecycle] })
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
