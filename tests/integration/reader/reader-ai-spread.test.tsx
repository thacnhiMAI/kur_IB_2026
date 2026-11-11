import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { ReaderAiPanel } from "@/components/reader/reader-ai-panel";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("attaches a selection from the even page and sends it only with the question", async () => {
  vi.stubGlobal("URL", Object.assign(class extends URL {}, {
    createObjectURL: () => "blob:https://reader.example/preview", revokeObjectURL: vi.fn()
  }));
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
    return Response.json({ ok: true, conversations: [conversation] });
  });
  vi.stubGlobal("fetch", fetchMock);

  const getText = vi.fn(async () => "");
  const file = new File(["selection"], "page-110-selection.png", { type: "image/png" });
  const props = {
    open: true, title: "Database Design", bookId: "book", contentId: "pdf", page: 109, lastVisiblePage: 110,
    getText, onClose: vi.fn(), onWidthChange: vi.fn()
  };
  const { rerender } = render(<ReaderAiPanel {...props} />);

  expect(screen.getByRole("button", { name: "Новый разговор: Страница 109" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Новый разговор: Страница 110" })).toBeVisible();
  rerender(<ReaderAiPanel {...props} selectionAttachment={{ page: 110, file }} />);
  expect(await screen.findByAltText("Вложение к сообщению")).toBeVisible();
  expect(fetchMock.mock.calls.some(([url]) => url === "/api/reader-ai")).toBe(false);
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "Explain this part" } });
  fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/reader-ai", expect.objectContaining({ method: "POST" })));
  const body = fetchMock.mock.calls.find(([url]) => url === "/api/reader-ai")?.[1]?.body as FormData;
  expect((body.get("image") as File).name).toBe("page-110-selection.png");
  expect(JSON.parse(String(body.get("payload")))).toMatchObject({ page: 110, question: "Explain this part" });
  expect(getText).not.toHaveBeenCalled();
  expect(await screen.findByText(/Worked ·/)).toBeVisible();

  fireEvent.paste(input, { clipboardData: { files: [new File(["pasted"], "outside.png", { type: "image/png" })] } });
  expect(await screen.findByAltText("Вложение к сообщению")).toBeVisible();
  expect(fetchMock.mock.calls.filter(([url]) => url === "/api/reader-ai")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Убрать вложение" }));
  expect(screen.queryByAltText("Вложение к сообщению")).not.toBeInTheDocument();
});
