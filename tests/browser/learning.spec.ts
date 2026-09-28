import { test, expect } from "@playwright/test";
test("home → homework → guided session → completion → resume", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Хамтдаа",
  );
  await page.screenshot({ path: ".data/home-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Суралцаж эхлэх" }).click();
  await page.getByRole("link", { name: "Даалгавраа эхлэх" }).click();
  await page.getByRole("button", { name: "24 ÷ 6", exact: true }).click();
  await page.getByRole("button", { name: "Хамтдаа бодъё" }).click();
  await expect(page.getByLabel("Чиний хариулт")).toBeVisible();
  await expect(page.locator(".messages")).not.toContainText("= 4");
  await page.getByLabel("Чиний хариулт").fill("99");
  await page.getByRole("button", { name: "Илгээх" }).click();
  await expect(page.locator(".messages")).toContainText("Дахиад хамт");
  await page.getByRole("button", { name: "Сэжүүр авъя" }).click();
  await expect(page.locator(".messages")).toContainText("Надад сэжүүр өгөөч.");
  for (const answer of ["12", "12", "2", "4"]) {
    const before = await page.locator(".message").count();
    await page.getByLabel("Чиний хариулт").fill(answer);
    await page.getByRole("button", { name: "Илгээх" }).click();
    await expect(page.locator(".message")).toHaveCount(before + 2);
  }
  await expect(page.locator(".completed")).toBeVisible();
  await page.reload();
  await expect(page.locator(".completed")).toBeVisible();
  await page.goto("/tutor");
  await expect(page.locator(".completed")).toBeVisible();
  await page.screenshot({ path: ".data/tutor-completed.png", fullPage: true });
  expect(errors).toEqual([]);
});
test("mobile fits viewport and unsupported input is explained", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".data/home-mobile.png", fullPage: true });
  await page.goto("/homework");
  await page.getByLabel("Миний бодлого").fill("25 ÷ 6");
  await page.getByRole("button", { name: "Хамтдаа бодъё" }).click();
  await expect(page.locator(".input-panel").getByRole("alert")).toContainText(
    "үлдэгдэлгүй",
  );
  await page.getByRole("button", { name: "24 ÷ 6", exact: true }).click();
  await page.getByRole("button", { name: "Хамтдаа бодъё" }).click();
  await expect(page.getByLabel("Чиний хариулт")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".data/tutor-mobile.png", fullPage: true });
});
test("sessions are scoped to browser identity, stale turns conflict", async ({
  request,
  playwright,
}) => {
  const created = await request.post("/api/learning/sessions", {
    data: { problem: "24 ÷ 6" },
  });
  expect(created.status()).toBe(201);
  const s = await created.json();
  if (process.env.EXPECT_STORAGE_MODE)
    expect(s.storage).toBe(process.env.EXPECT_STORAGE_MODE);
  const other = await playwright.request.newContext({
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
  });
  expect((await other.get(`/api/learning/sessions/${s.id}`)).status()).toBe(
    404,
  );
  await other.dispose();
  const path = `/api/learning/sessions/${s.id}/turns`;
  expect(
    (await request.post(path, { data: { answer: "12", version: 0 } })).status(),
  ).toBe(201);
  expect(
    (await request.post(path, { data: { answer: "12", version: 0 } })).status(),
  ).toBe(409);
  const restored = await (
    await request.get(`/api/learning/sessions/${s.id}`)
  ).json();
  expect(restored.attempts).toHaveLength(1);
});
