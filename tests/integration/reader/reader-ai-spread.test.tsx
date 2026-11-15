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
  const { rerender, unmount } = render(<ReaderAiPanel {...props} />);

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
  expect(screen.getByAltText("Отправленное вложение")).toBeVisible();
  expect(screen.queryByAltText("Вложение к сообщению")).not.toBeInTheDocument();

  fireEvent.paste(input, { clipboardData: { files: [new File(["pasted"], "outside.png", { type: "image/png" })] } });
  expect(await screen.findByAltText("Вложение к сообщению")).toBeVisible();
  expect(fetchMock.mock.calls.filter(([url]) => url === "/api/reader-ai")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Убрать вложение" }));
  expect(screen.queryByAltText("Вложение к сообщению")).not.toBeInTheDocument();
  unmount();
});

it("submits a second request in the same conversation before the first finishes", async () => {
  const conversation = {
    id: "parallel", scope: "page", page: 20, title: "Страница 20",
    updatedAt: "2026-01-01", createdAt: "2026-01-01", messages: []
  };
  let finishFirst!: (response: Response) => void;
  const first = new Promise<Response>(resolve => { finishFirst = resolve; });
  const questions: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/reader-ai") {
      const question = JSON.parse(String(options?.body)).question;
      questions.push(question);
      return questions.length === 1 ? first : Response.json({ answer: "Second result" });
    }
    if (options?.method === "POST") return Response.json({ ok: true, conversation });
    return Response.json({ ok: true, conversations: [] });
  }));
  render(<ReaderAiPanel open title="Book" bookId="book" contentId="pdf" page={20} lastVisiblePage={20}
    getText={async () => "Source"} onClose={vi.fn()} onWidthChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Новый разговор: Страница 20" }));
  const input = await screen.findByRole("textbox");
  fireEvent.change(input, { target: { value: "First question" } });
  fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
  await waitFor(() => expect(questions).toEqual(["First question"]));
  fireEvent.change(input, { target: { value: "Second question" } });
  fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
  expect(await screen.findByText("Second result")).toBeVisible();
  expect(questions).toEqual(["First question", "Second question"]);
  finishFirst(Response.json({ answer: "First result" }));
  expect(await screen.findByText("First result")).toBeVisible();
  expect(screen.getByText("First result").compareDocumentPosition(screen.getByText("Second question")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it("polls an accepted background job and renders its returned answer", async () => {
  const conversation = {
    id: "background", scope: "page", page: 20, title: "Страница 20",
    updatedAt: "2026-01-01", createdAt: "2026-01-01", messages: []
  };
  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url === "/api/reader-ai") return Response.json({ jobId: "queued-job", status: "queued" }, { status: 202 });
    if (url === "/api/reader-ai/jobs?id=queued-job") return Response.json({ answer: "Background answer", status: "done" });
    if (options?.method === "POST") return Response.json({ ok: true, conversation });
    return Response.json({ ok: true, conversations: [] });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<ReaderAiPanel open title="Book" bookId="book" contentId="pdf" page={20} lastVisiblePage={20}
    getText={async () => "Source"} onClose={vi.fn()} onWidthChange={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Новый разговор: Страница 20" }));
  fireEvent.change(await screen.findByRole("textbox"), { target: { value: "Explain" } });
  fireEvent.click(screen.getByRole("button", { name: "Отправить" }));
  expect(await screen.findByText(/Queued ·/)).toBeVisible();
  expect(await screen.findByText("Background answer", {}, { timeout: 2000 })).toBeVisible();
  expect(fetchMock.mock.calls.map(([url]) => url)).toContain("/api/reader-ai/jobs?id=queued-job");
});
