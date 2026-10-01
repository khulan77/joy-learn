"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  PracticeView,
  ProgressView,
  Skill,
} from "@/packages/shared/practice";
import { Joy } from "./shell";
async function request<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(`/api/learning/${path}`, {
    method: data ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      typeof body.message === "string" ? body.message : "Дахин оролдоорой.",
    );
  return body as T;
}
const difficultyNames = { 1: "Хялбар", 2: "Дунд", 3: "Ахисан" };
export function Practice({ initialSkill }: { initialSkill?: string }) {
  const [skills, setSkills] = useState<Skill[]>([]),
    [topic, setTopic] = useState("");
  const [session, setSession] = useState<PracticeView | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [answer, setAnswer] = useState("");
  const lock = useRef(false),
    bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const catalog = await request<{ skills: Skill[] }>("curriculum");
        if (cancelled) return;
        setSkills(catalog.skills);
        if (initialSkill) {
          const s = catalog.skills.find((s) => s.id === initialSkill);
          if (s) setTopic(s.topicId);
        } else {
          const saved = await request<PracticeView | null>("practice/resume");
          if (!cancelled) setSession(saved);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Дахин оролдоорой.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [initialSkill]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [session?.messages.length]);
  async function action(
    data: { skillId?: string; answer?: string; hint?: boolean },
    start = false,
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const s = await request<PracticeView>(
        start ? "practice" : `practice/${session!.id}/turns`,
        start ? data : { ...data, version: session!.version },
      );
      setSession(s);
      setAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Дахин оролдоорой.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (loading) return <p role="status">Дасгалуудыг ачаалж байна…</p>;
  return (
    <div className="practice-page">
      <div className="section-title">
        <div>
          <div className="eyebrow">ӨӨРӨӨ БОДОЖ СУРЪЯ</div>
          <h1>Дадлага хийе</h1>
        </div>
        <Link className="subtle-link" href="/progress">
          Миний ахиц →
        </Link>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button type="button" onClick={() => window.location.reload()}>
            Дахин ачаалах
          </button>
        </p>
      )}
      {!session ? (
        <section className="input-panel">
          <h2>Юуг давтах вэ?</h2>
          <p className="intro">3-р анги · Математик · Жишиг дасгалууд</p>
          <button
            className="button"
            disabled={busy}
            onClick={() => void action({}, true)}
          >
            Надад дасгал санал болго
          </button>
          <label className="practice-label" htmlFor="topic">
            Сэдвээ сонгоорой
          </label>
          <select
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            <option value="">Бүх сэдэв</option>
            {Array.from(new Map(skills.map((s) => [s.topicId, s.topic]))).map(
              ([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ),
            )}
          </select>
          <div className="skill-grid">
            {skills
              .filter((s) => !topic || s.topicId === topic)
              .map((s) => (
                <button
                  className="skill-card"
                  key={s.id}
                  disabled={busy}
                  onClick={() => void action({ skillId: s.id }, true)}
                >
                  <strong>{s.name}</strong>
                  <span>{s.concept}</span>
                  <span className="text-link">Эхлэх →</span>
                </button>
              ))}
          </div>
        </section>
      ) : (
        <>
          <div className="practice-meta">
            <span>
              {session.skill.topic} · {session.skill.name}
            </span>
            <span className="subject-pill">
              {difficultyNames[session.exercise.difficulty]}
            </span>
          </div>
          <section className="chat">
            <div className="practice-question">
              <Joy small />
              <h2>{session.exercise.question}</h2>
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
            {session.status === "completed" ? (
              <div className="completed">
                <strong>Бодож чадлаа!</strong>
                <button
                  disabled={busy}
                  className="button"
                  onClick={() =>
                    void action({ skillId: session.skill.id }, true)
                  }
                >
                  Дараагийн дасгал →
                </button>
              </div>
            ) : (
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void action({ answer });
                }}
              >
                <label className="sr-only" htmlFor="practice-answer">
                  Дасгалын хариулт
                </label>
                <div className="answer-row">
                  <input
                    id="practice-answer"
                    inputMode="numeric"
                    autoComplete="off"
                    value={answer}
                    maxLength={4}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={busy}
                    placeholder="Хариултаа бичээрэй"
                  />
                  <button className="button" disabled={busy || !answer.trim()}>
                    {busy ? "Хадгалж байна…" : "Шалгах"}
                  </button>
                </div>
                <button
                  className="hint-button"
                  type="button"
                  disabled={busy}
                  onClick={() => void action({ hint: true })}
                >
                  Сэжүүр авъя
                </button>
                <span className="saved">
                  {busy ? "Хадгалж байна…" : "✓ Хадгалагдсан"}
                </span>
              </form>
            )}
          </section>
          {session.selectionReason === "review" && (
            <p className="field-help">
              Энэ чадвараа бататгахын тулд өмнөх дасгалаа дахин бодъё.
            </p>
          )}
          <button
            className="hint-button"
            disabled={busy}
            onClick={() => setSession(null)}
          >
            Өөр чадвар сонгох
          </button>
        </>
      )}
    </div>
  );
}
export function Progress() {
  const [progress, setProgress] = useState<ProgressView | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    request<ProgressView>("progress")
      .then((p) => {
        if (!cancelled) setProgress(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="practice-page">
      <div className="eyebrow">БАГА БАГААР УРАГШИЛЪЯ</div>
      <h1>Миний ахиц</h1>
      <p className="intro">Дадлага бүр чамд сурахад тусална.</p>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : !progress ? (
        <p role="status">Ахиц ачаалж байна…</p>
      ) : (
        <>
          <div className="gentle-note">
            <Joy small />
            <div>
              <strong>
                Дараа нь:{" "}
                {
                  progress.skills.find(
                    (s) => s.skill.id === progress.recommendedSkillId,
                  )?.skill.name
                }
              </strong>
              <p>
                <Link
                  className="text-link"
                  href={`/practice?skill=${progress.recommendedSkillId}`}
                >
                  Дадлага хийх →
                </Link>
              </p>
            </div>
          </div>
          <div className="skill-grid">
            {progress.skills.map((p) => (
              <section className="input-panel progress-card" key={p.skill.id}>
                <span className="eyebrow">{p.skill.topic}</span>
                <h2>{p.skill.name}</h2>
                <p>
                  {p.practiced ? (
                    <>
                      <strong>{p.score}/100</strong> · Дадлагын оноо
                    </>
                  ) : (
                    "Одоогоор дадлага хийгээгүй"
                  )}
                </p>
                <progress
                  aria-label={`${p.skill.name} дадлагын оноо`}
                  value={p.practiced ? p.score : 0}
                  max={100}
                />
                <dl>
                  <div>
                    <dt>Оролдлого</dt>
                    <dd>{p.attempts}</dd>
                  </div>
                  <div>
                    <dt>Зөв хариулт</dt>
                    <dd>{p.correct}</dd>
                  </div>
                  <div>
                    <dt>Сэжүүр</dt>
                    <dd>{p.hintsUsed}</dd>
                  </div>
                </dl>
                <Link
                  className="text-link"
                  href={`/practice?skill=${p.skill.id}`}
                >
                  Давтах →
                </Link>
              </section>
            ))}
          </div>
          <p className="field-help">
            Энэ бол жишиг дасгалд суурилсан туршилтын оноо. Сургуулийн дүн эсвэл
            чадварын баталгаажсан үнэлгээ биш.
          </p>
        </>
      )}
    </div>
  );
}
