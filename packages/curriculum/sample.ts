import type {
  Skill,
  StructuredExercise,
  Difficulty,
  CommonMistake,
} from "../shared/practice";
// Authored development samples, not official curriculum. Sessions preserve a versioned snapshot of their content.
export const skills: Skill[] = [
  {
    id: "addition",
    name: "Хоёр оронтой тоог нэмэх",
    topicId: "sample-add-sub",
    topic: "Нэмэх ба хасах",
    concept: "Аравт, нэгж ба аравт шилжүүлэх",
    grade: 3,
    subject: "math",
  },
  {
    id: "subtraction",
    name: "Хоёр оронтой тоог хасах",
    topicId: "sample-add-sub",
    topic: "Нэмэх ба хасах",
    concept: "Аравт, нэгж ба аравт задлах",
    grade: 3,
    subject: "math",
  },
  {
    id: "multiplication",
    name: "Давтан нэмэх, үржүүлэх",
    topicId: "sample-multiply",
    topic: "Үржүүлэх",
    concept: "Ижил хэмжээтэй багцууд",
    grade: 3,
    subject: "math",
  },
  {
    id: "division",
    name: "Тэнцүү хуваах",
    topicId: "sample-divide",
    topic: "Хуваах",
    concept: "Тэнцүү хуваарилалт ба урвуу үржүүлэх үйлдэл",
    grade: 3,
    subject: "math",
  },
];
// Two carefully bounded examples per skill/difficulty. Templates author all metadata server-side.
const rows: [string, Difficulty, number, number][] = [
  ["addition", 1, 23, 15],
  ["addition", 1, 32, 24],
  ["addition", 2, 27, 15],
  ["addition", 2, 36, 28],
  ["addition", 3, 58, 37],
  ["addition", 3, 67, 26],
  ["subtraction", 1, 48, 23],
  ["subtraction", 1, 65, 32],
  ["subtraction", 2, 42, 17],
  ["subtraction", 2, 53, 28],
  ["subtraction", 3, 80, 36],
  ["subtraction", 3, 90, 47],
  ["multiplication", 1, 2, 3],
  ["multiplication", 1, 3, 4],
  ["multiplication", 2, 6, 4],
  ["multiplication", 2, 5, 6],
  ["multiplication", 3, 7, 8],
  ["multiplication", 3, 8, 9],
  ["division", 1, 12, 3],
  ["division", 1, 20, 5],
  ["division", 2, 24, 6],
  ["division", 2, 30, 5],
  ["division", 3, 56, 7],
  ["division", 3, 72, 8],
];
function make(
  [skillId, difficulty, a, b]: (typeof rows)[number],
  index: number,
): StructuredExercise {
  const skill = skills.find((s) => s.id === skillId)!;
  let question: string,
    answer: number,
    hints: [string, string, string],
    solutionSteps: string[],
    reinforcement: string,
    commonMistakes: CommonMistake[];
  if (skillId === "division") {
    answer = a / b;
    question =
      difficulty === 3
        ? `${a} чихрийг ${b} хүүхдэд тэнцүү хуваав. Нэг хүүхэд хэдэн чихэр авах вэ?`
        : `${a} ÷ ${b} = ?`;
    hints = [
      `${a} зүйлийг ${b} тэнцүү хэсэгт хуваана.`,
      `${b} × ямар тоо = ${a} болохыг бодоорой.`,
      `${a} ширхэг жижиг зүйл зураад, ${b} тойрогт нэг нэгээр нь тараагаарай. Нэг тойргийн зүйлсийг тоолоорой.`,
    ];
    solutionSteps = [
      `${b} тэнцүү бүлэг үүсгэнэ.`,
      `${b} × ${answer} = ${a}.`,
      `${a} ÷ ${b} = ${answer}.`,
    ];
    reinforcement = `${b} × ${answer} = ${a} учраас ${a} ÷ ${b} = ${answer}.`;
    commonMistakes = [
      {
        id: "subtract-instead-of-divide",
        answer: a - b,
        explanation: "Нэг удаа хассан байж магадгүй.",
        remediationHint: `Энд нэг удаа хасахгүй, ${b} хүүхдэд тэнцүү хуваана. Бүгд ижил тооны зүйл авах ёстой.`,
      },
    ];
  } else if (skillId === "multiplication") {
    answer = a * b;
    question =
      difficulty === 3
        ? `Нэг хайрцагт ${a} харандаа бий. ${b} хайрцагт нийт хэдэн харандаа байх вэ?`
        : `${a} × ${b} = ?`;
    hints = [
      `${a} ширхэгтэй ${b} багцыг төсөөлөөрэй.`,
      `${a}-г ${b} удаа нэмж үзээрэй.`,
      `${Array.from({ length: b }, () => a).join(" + ")} гэж бичээд зүүнээс нь хоёр хоёроор нэмж бодоорой.`,
    ];
    solutionSteps = [
      `${b} багц бүрд ${a} байна.`,
      `${Array.from({ length: b }, () => a).join(" + ")} = ${answer}.`,
    ];
    reinforcement = `${a}-г ${b} удаа нэмэхэд ${answer} болно.`;
    commonMistakes = [
      {
        id: "add-instead-of-multiply",
        answer: a + b,
        explanation: "Үржүүлэхийн оронд нэмсэн байж магадгүй.",
        remediationHint: `${a} ба ${b}-ыг нэг удаа нэмэх биш, ${a}-г ${b} удаа нэмнэ.`,
      },
    ];
  } else {
    const plus = skillId === "addition",
      op = plus ? "+" : "−",
      tens = Math.floor(b / 10) * 10,
      ones = b % 10,
      intermediate = plus ? a + tens : a - tens;
    answer = plus ? a + b : a - b;
    question = `${a} ${op} ${b} = ?`;
    hints = [
      `${b}-ыг аравт ба нэгжээр нь салгаарай.`,
      `${b} = ${tens} + ${ones}. Эхлээд ${a} ${op} ${tens}-ыг бодоорой.`,
      `${a}-аас эхлээд ${tens / 10} удаа 10-аар ${plus ? "нэмээд" : "хасаад"}, дараа нь ${ones} удаа нэгээр ${plus ? "нэмээрэй" : "хасаарай"}.`,
    ];
    solutionSteps = [
      `${b} = ${tens} + ${ones}.`,
      `${a} ${op} ${tens} = ${intermediate}.`,
      `${intermediate} ${op} ${ones} = ${answer}.`,
    ];
    reinforcement = `${b}-ыг ${tens} ба ${ones} гэж салгаад ${plus ? "нэмж" : "хасаж"} болно: ${intermediate} ${op} ${ones} = ${answer}.`;
    const wrong =
      plus && (a % 10) + (b % 10) >= 10
        ? answer - 10
        : !plus && a % 10 < b % 10
          ? Math.floor(a / 10) * 10 - tens + Math.abs((a % 10) - (b % 10))
          : intermediate;
    commonMistakes = [
      {
        id: plus ? "place-value-addition" : "place-value-subtraction",
        answer: wrong,
        explanation: "Аравт эсвэл нэгжийг орхигдуулсан байж магадгүй.",
        remediationHint:
          wrong === intermediate
            ? `Аравтын хэсгийг бодсон байна. Үлдсэн ${ones} нэгжийг бас ${plus ? "нэмээрэй" : "хасаарай"}.`
            : plus
              ? "Нэгжүүд нийлээд 10 хүрвэл шинэ аравт үүснэ. Аравтдаа түүнийг нэмэхээ санаарай."
              : "Нэгж хүрэлцэхгүй бол нэг аравтыг 10 нэгж болгон задлаарай. Аравтын тоо нэгээр багасна.",
      },
    ];
  }
  return {
    id: `sample-v1-${skillId}-${index + 1}`,
    version: 1,
    source: "sample",
    skillId,
    grade: 3,
    subject: "math",
    topicId: skill.topicId,
    difficulty,
    question,
    correctAnswer: answer,
    hints,
    solutionSteps,
    reinforcement,
    commonMistakes: commonMistakes.filter((m) => m.answer !== answer),
  };
}
export const sampleExercises: StructuredExercise[] = rows.map(make);
