import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AiUsageMenu } from "@/components/site/ai-usage-menu";

it("opens usage on mouse hover and includes reset information for both windows", async () => {
  const resetsAt = new Date(Date.now() + 60_000).toISOString();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
    short: { used: 27, limit: 100, resetsAt },
    week: { used: 0, limit: 100, resetsAt: null }
  })));

  try {
    render(<AiUsageMenu />);
    const trigger = screen.getByRole("button", { name: "Использование AI" });
    const hover = createEvent.pointerOver(trigger);
    Object.defineProperty(hover, "pointerType", { value: "mouse" });
    fireEvent(trigger, hover);

    expect(await screen.findByText("Осталось 73%")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Сброс")).toBeInTheDocument();
    expect(screen.getByText("Период начнётся с первого запроса")).toBeInTheDocument();
  } finally {
    vi.unstubAllGlobals();
  }
});

it("updates the closed icon and open menu when Reader usage changes", async () => {
  let used = 27;
  const resetsAt = new Date(Date.now() + 60_000).toISOString();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({
    short: { used, limit: 100, resetsAt },
    week: { used, limit: 200, resetsAt }
  })));
  const notify = () => fireEvent(window, new Event("reader-ai-usage-updated"));

  try {
    render(<AiUsageMenu />);
    const trigger = screen.getByRole("button", { name: "Использование AI" });
    const arc = trigger.querySelector("[stroke-dasharray]");
    notify();
    await waitFor(() => expect(arc).toHaveAttribute("stroke-dasharray", "73 100"));

    fireEvent.click(trigger);
    expect(await screen.findByText("Осталось 73%")).toBeInTheDocument();
    used = 40;
    notify();
    expect(await screen.findByText("Осталось 60%")).toBeInTheDocument();
    expect(arc).toHaveAttribute("stroke-dasharray", "60 100");
  } finally {
    vi.unstubAllGlobals();
  }
});
