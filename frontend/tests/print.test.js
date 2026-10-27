import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

let server;
let browser;
let url;

before(async () => {
  server = await createServer({ configFile: false, server: { port: 0 } });
  await server.listen();
  url = `http://localhost:${server.httpServer.address().port}`;
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || undefined, headless: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

async function openPrintView(name, texts) {
  const context = await browser.newContext();
  const steps = texts.map((text, index) => ({ id: String(index), text }));
  const session = {
    id: "test", name, allSteps: steps, keySteps: steps,
    rawExtraction: "", rawLlmAllSteps: "", rawLlmKeySteps: "",
  };
  await context.addInitScript(() => {
    window.print = () => { window.__printCalled = true; };
  });
  await context.route("**/api/status", (route) => route.fulfill({
    json: { extraction: { available: true, reason: "" }, sessions: { available: true, reason: "" } },
  }));
  await context.route("**/api/sessions", (route) => route.fulfill({ json: [{ id: "test", name }] }));
  await context.route("**/api/sessions/test", (route) => route.fulfill({ json: session }));
  const page = await context.newPage();
  await page.goto(url);
  await page.getByRole("button", { name: /Saved sessions/ }).click();
  await page.getByTitle("Load").click();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: /Print/ }).click();
  return { context, popup: await popupPromise };
}

test("print view treats session and step markup as text", async () => {
  const name = '<img src=x onerror="window.injected=true">';
  const texts = ['</li><script>window.injected=true</script>', '<img src=x onerror="window.injected=true">', "Place & arrange <pieces>"];
  const { context, popup } = await openPrintView(name, texts);
  try {
    assert.equal(await popup.title(), `${name} – Print`);
    assert.equal(await popup.locator("h1").textContent(), name);
    assert.deepEqual(await popup.locator("ol > li").allTextContents(), texts);
    assert.equal(await popup.locator("img, script").count(), 0);
    assert.equal(await popup.evaluate(() => window.injected), undefined);
    assert.equal(await popup.evaluate(() => window.__printCalled), true);
  } finally {
    await context.close();
  }
});

test("print view uses default headings for an empty session name", async () => {
  const { context, popup } = await openPrintView("", ["Set up the board"]);
  try {
    assert.equal(await popup.title(), "Key Steps – Print");
    assert.equal(await popup.locator("h1").textContent(), "Key Setup Steps");
    assert.deepEqual(await popup.locator("ol > li").allTextContents(), ["Set up the board"]);
  } finally {
    await context.close();
  }
});
