import { expect, test } from "@playwright/test";
test("mobile practice: targeted hints, mastery, adaptation and resume", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/practice");
  await page.getByLabel("Сэдвээ сонгоорой").selectOption("sample-divide");
  await page
    .getByRole("button", { name: "Тэнцүү хуваах", exact: false })
    .click();
  await expect(page.locator(".practice-question")).toContainText("24 ÷ 6");
  await expect(page.locator(".practice-meta")).toContainText("Дунд");
  for (const [i, answer] of ["18", "999", "999"].entries()) {
    await page.getByLabel("Дасгалын хариулт").fill(answer);
    await page.getByRole("button", { name: "Шалгах", exact: true }).click();
    await expect(page.locator(".message")).toHaveCount(1 + (i + 1) * 2);
  }
  await expect(page.locator(".messages")).toContainText("нэг удаа хасахгүй");
  await expect(page.locator(".messages")).toContainText("тойрог");
  await expect(page.locator(".message").last()).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: ".data/day2-practice-mobile.png",
    fullPage: true,
  });
  await page.reload();
  await expect(page.locator(".message")).toHaveCount(7);
  await page.getByLabel("Дасгалын хариулт").fill("4");
  await page.getByRole("button", { name: "Шалгах", exact: true }).click();
  await expect(page.locator(".completed")).toBeVisible();
  await page.getByRole("button", { name: "Дараагийн дасгал" }).click();
  await expect(page.locator(".practice-meta")).toContainText("Хялбар");
  await expect(page.locator(".practice-question")).not.toContainText("24 ÷ 6");
  await page.getByRole("link", { name: "Миний ахиц →", exact: true }).click();
  const division = page.locator(".progress-card").filter({
    has: page.getByRole("heading", { name: "Тэнцүү хуваах", exact: true }),
  });
  await expect(division).toContainText("36/100");
  await expect(division.locator("dd")).toHaveText(["4", "1", "3"]);
  await page.reload();
  await expect(division).toContainText("36/100");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".data/day2-progress-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("independent successes raise difficulty and avoid repeating the previous exercise", async ({
  page,
}) => {
  await page.goto("/practice");
  await page
    .getByRole("button", { name: "Тэнцүү хуваах", exact: false })
    .click();
  for (const answer of ["4", "6"]) {
    await page.getByLabel("Дасгалын хариулт").fill(answer);
    await page.getByRole("button", { name: "Шалгах", exact: true }).click();
    await page.getByRole("button", { name: "Дараагийн дасгал" }).click();
  }
  await expect(page.locator(".practice-meta")).toContainText("Ахисан");
  await expect(page.locator(".practice-question")).toContainText("56");
});
