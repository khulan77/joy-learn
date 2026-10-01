import Link from "next/link";
export function Joy({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "joy-face small" : "joy-face"} aria-hidden="true">
      <span className="eyes">• •</span>
      <span className="smile" />
    </span>
  );
}
export function Shell({
  children,
  active = "home",
}: {
  children: React.ReactNode;
  active?: string;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            j<span>✦</span>
          </span>
          joy<span className="brand-light">learn</span>
        </Link>
        <div className="workspace-label">МИНИЙ СУРАЛЦАХ ОРЧИН</div>
        <nav>
          <Link
            className={active === "home" ? "nav-item selected" : "nav-item"}
            href="/learn"
          >
            <span>⌂</span>Миний хуудас
          </Link>
          <Link
            className={active === "homework" ? "nav-item selected" : "nav-item"}
            href="/homework"
          >
            <span>▤</span>Гэрийн даалгавар
          </Link>
          <Link
            className={active === "tutor" ? "nav-item selected" : "nav-item"}
            href="/tutor"
          >
            <span>☏</span>Жойтой суралцах
          </Link>
          <Link
            className={active === "practice" ? "nav-item selected" : "nav-item"}
            href="/practice"
          >
            <span>✎</span>Дадлага
          </Link>
          <Link
            className={active === "progress" ? "nav-item selected" : "nav-item"}
            href="/progress"
          >
            <span>▥</span>Миний ахиц
          </Link>
        </nav>
        <div className="sidebar-note">
          <span>✧</span>
          <strong>
            Жижиг алхам.
            <br />
            Том нээлт.
          </strong>
          <p>
            Өдөр бүр бага багаар,
            <br />
            өөрийн хурдаар суралцаарай.
          </p>
        </div>
        <div className="profile">
          <span className="avatar">Б</span>
          <div>
            <strong>Бяцхан суралцагч</strong>
            <small>3-р анги · Математик</small>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span>Сурах аялал чинь эндээс эхэлнэ</span>
          <span className="grade-tag">✧ &nbsp; 3-р анги</span>
        </header>
        <main>{children}</main>
        <footer>
          Хүүхэд бүр өөрийн хурдаар суралцдаг.{" "}
          <span>Joy Learn · Туршилтын хувилбар</span>
        </footer>
      </div>
    </div>
  );
}
