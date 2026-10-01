import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
export const runtime = "nodejs";
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const path = (await context.params).path ?? [];
  const resource = path[0];
  const allowed =
    (path.length === 1 &&
      ["sessions", "curriculum", "progress", "practice"].includes(resource)) ||
    (path.length === 2 && resource === "practice" && path[1] === "resume") ||
    (["sessions", "practice"].includes(resource) &&
      /^[0-9a-f-]{36}$/.test(path[1] ?? "") &&
      (path.length === 2 || (path.length === 3 && path[2] === "turns")));
  if (!allowed)
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (
    request.method === "POST" &&
    request.headers.get("origin") &&
    request.headers.get("origin") !== request.nextUrl.origin
  )
    return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  const jar = await cookies();
  const existing = jar.get("joy-student")?.value;
  const student =
    existing && /^[0-9a-f-]{36}$/.test(existing)
      ? existing
      : crypto.randomUUID();
  const body = request.method === "POST" ? await request.text() : undefined;
  if (body && body.length > 8192)
    return NextResponse.json({ message: "Request too large" }, { status: 413 });
  try {
    const response = await fetch(
      `${process.env.API_URL ?? "http://127.0.0.1:3001"}/${path.join("/")}`,
      {
        method: request.method,
        headers: {
          "Content-Type": "application/json",
          "x-student-id": student,
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    const result = NextResponse.json(await response.json(), {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
    result.cookies.set("joy-student", student, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return result;
  } catch {
    return NextResponse.json(
      { message: "Холболт амжилтгүй боллоо. Түр хүлээгээд дахин оролдоорой." },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
