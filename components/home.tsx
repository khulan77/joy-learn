import Link from "next/link";
import { Joy, Shell } from "./shell";
export function Home({ landing = false }: { landing?: boolean }) {
  return (
    <Shell>
      <div className="page-heading">
        <div>
          <div className="eyebrow">ӨНӨӨДӨР НЭГ ШИНЭ ЗҮЙЛ СУРЪЯ</div>
          <h1>
            {landing ? "Хамтдаа учрыг нь олъё." : "Сайн уу, бяцхан найз аа!"}{" "}
            <span className="wave">☀</span>
          </h1>
          <p>Мэдэхгүй байх зүгээр. Хамтдаа бодоод үзье.</p>
        </div>
        <span className="subject-pill">Математик · 3-р анги</span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="pill">ЧИНИЙ СУРАЛЦАХ НАЙЗ</span>
          <h2>
            Хэцүү санагдсан уу?
            <br />
            Жой чамтай хамт.
          </h2>
          <p>
            Хариуг нь шууд хэлэхгүй ээ. Жижиг сэжүүр,
            <br className="desktop" /> зөв асуултаар өөрөө бодоход чинь тусалъя.
          </p>
          <Link className="button" href={landing ? "/learn" : "/homework"}>
            {landing ? "Суралцаж эхлэх" : "Даалгавраа эхлэх"} <span>↗</span>
          </Link>
          <div className="hero-caption">
            <span className="status-dot" />
            Алхам алхмаар · Өөрийн хурдаар
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="math-float math-one">＋</span>
          <span className="math-float math-two">÷</span>
          <span className="sparkle">✦</span>
          <div className="speech">Чи чадна аа!</div>
          <Joy />
          <div className="art-shadow" />
          <span className="math-float math-three">3 × 4</span>
          <span className="art-star">✧</span>
        </div>
      </section>
      <section className="next-section">
        <div className="section-title">
          <h2>Өнөөдөр юу хийх вэ?</h2>
          <span>Нэг алхмаас эхэлцгээе</span>
        </div>
        <div className="action-grid">
          <Link href="/homework" className="action-card">
            <span className="card-icon orange">▤</span>
            <div>
              <h3>Гэрийн даалгавраа бодъё</h3>
              <p>
                Бодлогоо бичээд, Жойтой хамт
                <br />
                алхам алхмаар бодоорой.
              </p>
              <span className="text-link">
                Бодлого оруулах <b>→</b>
              </span>
            </div>
          </Link>
          <Link href="/tutor" className="action-card">
            <span className="card-icon lavender">↻</span>
            <div>
              <h3>Үргэлжлүүлэн суралцъя</h3>
              <p>
                Эхэлсэн бодлого руугаа буцаж,
                <br />
                дараагийн алхмаа хийгээрэй.
              </p>
              <span className="text-link">
                Хичээл рүү орох <b>→</b>
              </span>
            </div>
          </Link>
        </div>
      </section>
      <section className="how">
        <div className="section-title">
          <h2>Бид яаж хамтдаа сурах вэ?</h2>
          <span>Хариуг олохоос илүү, учрыг ойлгоё.</span>
        </div>
        <div className="steps">
          <div>
            <span>01</span>
            <h3>Бодлогоо бич</h3>
            <p>Хаана гацсанаа Жойд хэлээрэй.</p>
          </div>
          <div>
            <span>02</span>
            <h3>Хамтдаа бод</h3>
            <p>Сэжүүр аваад, өөрөө оролдоорой.</p>
          </div>
          <div>
            <span>03</span>
            <h3>“Аан, ойлголоо!”</h3>
            <p>Шинэ мэдлэгээ өөрөө нээгээрэй.</p>
          </div>
        </div>
      </section>
      <div className="parent-note">
        <span>♡</span>
        <p>
          <strong>Бэлэн хариу биш, бие даан сурах итгэл.</strong> Хүүхэд өөрөө
          бодож, ойлгоход нь бид тусална.
        </p>
        <span className="note-label">ЭЦЭГ ЭХЧҮҮДЭД</span>
      </div>
    </Shell>
  );
}
