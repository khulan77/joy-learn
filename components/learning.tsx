"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionView } from "@/packages/shared";
import { examples } from "@/packages/curriculum";
import { Joy } from "./shell";
async function api(path: string, data?: unknown): Promise<SessionView> {
  const response = await fetch(`/api/learning/sessions${path}`, {
    method: data ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.message === "string" ? result.message : "Дахин оролдоорой.",
    );
  return result as SessionView;
}
export function Homework() {
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const router = useRouter();
  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const session = await api("", { problem });
      try {
        localStorage.setItem("joy-session", session.id);
      } catch {}
      router.push(`/tutor?session=${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Холболтоо шалгаарай.");
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <div className="narrow">
      <div className="eyebrow">ГЭРИЙН ДААЛГАВАР</div>
      <h1>Юуг хамтдаа бодох вэ?</h1>
      <p className="intro">
        Бодлогоо бичээрэй. Жой чамд эхний алхмыг олоход тусална.
      </p>
      <form className="input-panel" onSubmit={start}>
        <label htmlFor="problem">Миний бодлого</label>
        <textarea
          id="problem"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Жишээ нь: 24 ÷ 6"
          maxLength={200}
          required
          disabled={busy}
        />
        <p className="field-help">
          Хоёр оронтой нэмэх, хасах · 2–10-ын хүрд · Үлдэгдэлгүй хуваах
        </p>
        <div className="example-row">
          <span>Туршаад үз:</span>
          {examples.map((x) => (
            <button
              key={x}
              type="button"
              className="chip"
              disabled={busy}
              onClick={() => setProblem(x)}
            >
              {x}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="button" disabled={busy || !problem.trim()}>
          {busy ? "Бэлдэж байна…" : "Хамтдаа бодъё"} <span>→</span>
        </button>
      </form>
      <div className="gentle-note">
        <Joy small />
        <p>
          Алдаа гаргаж болно шүү.
          <br />
          <strong>Оролдох бүрдээ чи суралцаж байгаа.</strong>
        </p>
      </div>
    </div>
  );
}
export function Tutor({ initialId }: { initialId?: string }) {
  const [session, setSession] = useState<SessionView | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(""),
    [error, setError] = useState("");
  const lock = useRef(false),
    bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let cancelled = false;
    let id = initialId;
    try {
      id ??= localStorage.getItem("joy-session") ?? undefined;
    } catch {}
    const task = id ? api(`/${id}`) : Promise.resolve(null);
    task
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialId]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [session?.messages.length]);
  async function send(hint = false) {
    if (!session || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await api(`/${session.id}/turns`, {
        version: session.version,
        ...(hint ? { hint: true } : { answer }),
      });
      setSession(next);
      setAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Дахин оролдоорой.");
    } finally {
      lock.current = false;
      setBusy(false);
      input.current?.focus();
    }
  }
  if (loading)
    return (
      <div className="empty" role="status">
        Хичээлийг ачаалж байна…
      </div>
    );
  if (!session)
    return (
      <div className="empty">
        <Joy />
        <h1>Хамтдаа эхлэх үү?</h1>
        <p>{error || "Бодлогоо оруулаад, сурах эхний алхмаа хийгээрэй."}</p>
        <Link className="button" href="/homework">
          Бодлого оруулах →
        </Link>
      </div>
    );
  return (
    <div className="tutor-layout">
      <div className="section-title">
        <div>
          <div className="eyebrow">ЖОЙТОЙ СУРАЛЦАХ</div>
          <h1>Хамтдаа бодъё.</h1>
        </div>
        <Link href="/homework" className="subtle-link">
          Шинэ бодлого ↗
        </Link>
      </div>
      <div className="tutor-grid">
        <section className="chat">
          <div className="chat-header">
            <Joy small />
            <div>
              <strong>Жой</strong>
              <small>Чиний суралцах найз</small>
            </div>
            <span className="online">Алхам алхмаар</span>
          </div>
          <div
            className="messages"
            aria-live="polite"
            aria-relevant="additions"
          >
            {session.messages.map((m) => (
              <div key={m.id} className={`message ${m.role}`}>
                <span className="message-author">
                  {m.role === "tutor" ? "Жой" : "Чи"}
                </span>
                <p>{m.content}</p>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {session.status === "completed" ? (
            <div className="completed">
              <strong>✦ Сайн ажиллалаа!</strong>
              <Link className="button" href="/homework">
                Дараагийн бодлого →
              </Link>
            </div>
          ) : (
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
            >
              <label htmlFor="answer" className="sr-only">
                Чиний хариулт
              </label>
              <div className="answer-row">
                <input
                  ref={input}
                  id="answer"
                  autoComplete="off"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={300}
                  placeholder="Хариултаа энд бичээрэй…"
                  disabled={busy}
                />
                <button className="button" disabled={busy || !answer.trim()}>
                  {busy ? "…" : "Илгээх ↑"}
                </button>
              </div>
              <button
                type="button"
                className="hint-button"
                disabled={busy}
                onClick={() => void send(true)}
              >
                ☀ Сэжүүр авъя
              </button>
              <span className="saved">
                {busy ? "Хадгалж байна…" : "✓ Хадгалагдсан"}
              </span>
            </form>
          )}
        </section>
        <aside className="session-panel">
          <span className="eyebrow">МИНИЙ БОДЛОГО</span>
          <h2>{session.problem}</h2>
          <span className="subject-pill">{session.topic}</span>
          <hr />
          <strong>Нэг нэг алхмаар</strong>
          <p>
            {session.step} / {session.totalSteps} алхам
          </p>
          <progress value={session.step} max={session.totalSteps} />
          <p>
            Хурд чухал биш.
            <br />
            Ойлгох нь л чухал.
          </p>
          <div className="storage-note">
            {session.storage === "file"
              ? "Туршилтын хичээл · Энэ төхөөрөмжийн серверт хадгална."
              : "Хичээл хадгалагдаж байна."}
          </div>
        </aside>
      </div>
    </div>
  );
}
