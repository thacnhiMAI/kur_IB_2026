import { fireEvent, render } from "@testing-library/react";
import { expect, it } from "vitest";
import { ReaderAnswer } from "@/components/reader/reader-answer";

it("renders emphasis and multiline legacy math without interpreting raw HTML", () => {
  const { container } = render(<ReaderAnswer content={[
    "**Kết quả** và *giải thích*.",
    "",
    "$",
    "f_{\\mathrm{avg}}(\\pi)=\\mathbb E[f(V(\\pi,\\Phi),\\Phi)]",
    "$",
    "",
    "Với $|V| \\le k$.",
    "",
    "<img src='https://example.test/tracker'>"
  ].join("\n")} />);
  expect(container.querySelector("strong")?.textContent).toBe("Kết quả");
  expect(container.querySelector("em")?.textContent).toBe("giải thích");
  expect(container.querySelector(".katex-display .katex")).not.toBeNull();
  expect(container.querySelectorAll(".katex")).toHaveLength(2);
  expect(container.querySelector("img")).toBeNull();
});

it("renders a Markdown table and lets the reader choose whether to load a remote image", () => {
  const { container, getByRole } = render(<ReaderAnswer content={[
    "| Model | Status |", "| --- | --- |", "| Codex | Ready |", "",
    "![Diagram](https://example.test/figure.png)"
  ].join("\n")} />);
  expect(getByRole("columnheader", { name: "Model" })).toBeTruthy();
  expect(getByRole("cell", { name: "Ready" })).toBeTruthy();
  expect(container.querySelector("img")).toBeNull();
  fireEvent.click(getByRole("button", { name: /Diagram/ }));
  expect(getByRole("img", { name: "Diagram" }).getAttribute("src")).toBe("https://example.test/figure.png");
});
