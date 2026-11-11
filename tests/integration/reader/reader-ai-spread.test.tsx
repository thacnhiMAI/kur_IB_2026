import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { ReaderAiPanel } from "@/components/reader/reader-ai-panel";

afterEach(() => vi.unstubAllGlobals());

it("offers both visible pages and sends only the selected even page in image mode", async () => {
  const conversation = {
    id: "right-page", scope: "page", page: 110, title: "Страница 110",
    updatedAt: "2026-01-01", createdAt: "2026-01-01", messages: []
  };
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/reader-ai") return Response.json({ answer: "Текст страницы 110" });
    if (options?.method === "POST") {
      expect(JSON.parse(String(options.body)).page).toBe(110);
      return Response.json({ ok: true, conversation });
    }
    return Response.json({ ok: true, conversations: [] });
  });
  vi.stubGlobal("fetch", fetchMock);

  const getText = vi.fn(async () => "");
  const getPageImage = vi.fn(async () => new File(["page 110"], "page-110.png", { type: "image/png" }));
  render(
    <ReaderAiPanel open title="Database Design" bookId="book" contentId="pdf" page={109} lastVisiblePage={110}
      getText={getText} getPageImage={getPageImage} onClose={vi.fn()} onWidthChange={vi.fn()} />
  );

  expect(screen.getByRole("button", { name: "Новый разговор: Страница 109" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Новый разговор: Страница 110" }));
  fireEvent.click(await screen.findByRole("checkbox", { name: "Отправлять изображение страницы в OpenAI" }));
  fireEvent.click(screen.getByRole("button", { name: "Кратко" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/reader-ai", expect.objectContaining({ method: "POST" })));
  const body = fetchMock.mock.calls.find(([url]) => url === "/api/reader-ai")?.[1]?.body as FormData;
  expect((body.get("image") as File).name).toBe("page-110.png");
  expect(JSON.parse(String(body.get("payload"))).page).toBe(110);
  expect(getPageImage).toHaveBeenCalledExactlyOnceWith(110);
  expect(getText).not.toHaveBeenCalled();
});
