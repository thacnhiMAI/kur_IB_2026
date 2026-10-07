import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FilterableCheckboxList } from "@/components/admin/filterable-checkbox-list";

describe("FilterableCheckboxList", () => {
  it("keeps selected ids in form fields when selected items are filtered out", () => {
    const { container } = render(
      <FilterableCheckboxList
        legend="Авторы"
        name="authorIds"
        items={[
          { id: "a-1", name: "Alpha Author", slug: "alpha-author" },
          { id: "a-2", name: "Beta Author", slug: "beta-author" }
        ]}
        initialSelectedIds={["a-1"]}
        placeholder="Поиск по имени или slug..."
      />
    );

    fireEvent.change(screen.getByPlaceholderText("Поиск по имени или slug..."), {
      target: { value: "beta" }
    });

    const hiddenValues = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="hidden"][name="authorIds"]')
    ).map((input) => input.value);

    expect(hiddenValues).toEqual(["a-1"]);
    expect(screen.queryByText("Alpha Author")).not.toBeInTheDocument();
    expect(screen.getByText("Beta Author")).toBeInTheDocument();
  });
});
