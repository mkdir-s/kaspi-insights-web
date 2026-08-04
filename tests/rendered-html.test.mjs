import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Kaspi Insights upload experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Kaspi Insights/);
  assert.match(html, /Вся финансовая картина/);
  assert.match(html, /Перетащите PDF-выписку/);
  assert.match(html, /Локальная обработка/);
  assert.match(html, /Красивый экспорт/);
  assert.match(html, /Как получить выписку в Kaspi Gold/);
  assert.match(html, /С 1 января/);
  assert.match(html, /Выгрузите в PDF/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("declares privacy and the supported PDF workflow", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /Данные остаются на устройстве/);
  assert.match(html, /Файл обрабатывается только в вашем браузере/);
  assert.match(html, /accept="application\/pdf,.pdf"/);
});
