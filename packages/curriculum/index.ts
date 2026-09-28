import type { Exercise, Operation, Step } from "../shared";

export const examples = ["24 ÷ 6", "23 + 15", "42 − 17", "6 × 4"];
const step = (
  question: string,
  answer: number,
  first: string,
  second: string,
): Step => ({ question, answer, hints: [first, second] });
export function createExercise(input: string): Exercise | null {
  const match = input
    .trim()
    .match(/^(\d{1,3})\s*([+\-−×x*÷/:])\s*(\d{1,3})\s*(?:=\s*\??)?$/i);
  if (!match) return null;
  const a = Number(match[1]),
    b = Number(match[3]);
  const raw = match[2];
  const operation: Operation = /[x×*]/i.test(raw)
    ? "×"
    : /[÷/:]/.test(raw)
      ? "÷"
      : raw === "−"
        ? "-"
        : (raw as Operation);
  let steps: Step[];
  let topic: string;
  if (operation === "÷") {
    if (b < 2 || b > 10 || a % b !== 0 || a / b < 2 || a / b > 10) return null;
    topic = "Тэнцүү хуваах";
    const first = Math.max(1, Math.floor(a / b / 2));
    steps = [
      step(
        `${a} алимыг ${b} хүүхдэд тэнцүү хуваая. Эхлээд хүүхэд бүрд ${first} алим өгвөл нийт хэдэн алим өгөх вэ?`,
        b * first,
        `${b} хүүхэд тус бүр ${first} алим авна. ${b} × ${first} гэж бодоорой.`,
        `${Array.from({ length: b }, () => first).join(" + ")} гэж нэмж үзээрэй.`,
      ),
      step(
        `${a} алимнаас ${b * first}-ыг өгсөн. Хэдэн алим үлдсэн бэ?`,
        a - b * first,
        `${a} − ${b * first} гэж бодоорой.`,
        `${b * first}-аас ${a} хүртэл хэдээр нэмэгдэхийг тоолоорой.`,
      ),
      step(
        `Үлдсэн ${a - b * first} алимыг ${b} хүүхдэд хуваавал хүүхэд бүр нэмж хэдийг авах вэ?`,
        a / b - first,
        `${b} × ямар тоо = ${a - b * first} болох вэ гэдгийг бодоорой.`,
        `Нэг нэгээр нь тарааж байна гэж төсөөлөөд, хэдэн удаа тараахыг тоолоорой.`,
      ),
      step(
        `Хүүхэд бүр эхлээд ${first}, дараа нь ${a / b - first} алим авсан. Нэг хүүхэд нийт хэдэн алим авсан бэ?`,
        a / b,
        `${first} + ${a / b - first} гэж бодоорой.`,
        `Эхний болон дараагийн алимуудаа хамтад нь тоолоорой.`,
      ),
    ];
  } else if (operation === "×") {
    if (a < 2 || a > 10 || b < 2 || b > 10) return null;
    topic = "Үржүүлэх";
    steps = [
      step(
        `${a} ширхэгтэй ${b} багц байна. Эхний ${b - 1} багцад нийт хэд байх вэ?`,
        a * (b - 1),
        `${a}-г ${b - 1} удаа нэмээрэй.`,
        `${Array.from({ length: b - 1 }, () => a).join(" + ")} гэж бодоорой.`,
      ),
      step(
        `Одоо сүүлийн ${a} ширхэгийг нэмье. ${a * (b - 1)} + ${a} хэд болох вэ?`,
        a * b,
        `Өмнөх тооноос ${a}-аар нэмэгдүүлээрэй.`,
        `${a * (b - 1)}-аас эхлээд ${a} удаа нэгээр урагш тоолоорой.`,
      ),
    ];
  } else {
    if (a < 10 || a > 99 || b < 10 || b > 99 || (operation === "-" && a < b))
      return null;
    const tens = Math.floor(b / 10) * 10,
      ones = b % 10,
      intermediate = operation === "+" ? a + tens : a - tens;
    topic = operation === "+" ? "Нэмэх" : "Хасах";
    steps = [
      step(
        `${b}-ыг ${tens} ба ${ones} гэж салгая. Эхлээд ${a} ${operation} ${tens} хэд вэ?`,
        intermediate,
        `Аравтаар ${operation === "+" ? "урагш" : "хойш"} тоолоорой.`,
        `${a}-аас эхлээд ${tens / 10} удаа 10-аар ${operation === "+" ? "нэмээрэй" : "хасаарай"}.`,
      ),
      step(
        `Одоо үлдсэн ${ones}-ыг ${operation === "+" ? "нэмье" : "хасъя"}. ${intermediate} ${operation} ${ones} хэд вэ?`,
        operation === "+" ? a + b : a - b,
        `Нэгжээр ${operation === "+" ? "урагш" : "хойш"} тоолоорой.`,
        `${intermediate}-аас эхлээд ${ones} удаа нэгээр ${operation === "+" ? "нэмээрэй" : "хасаарай"}.`,
      ),
    ];
  }
  return { text: `${a} ${operation} ${b}`, topic, operation, steps };
}
