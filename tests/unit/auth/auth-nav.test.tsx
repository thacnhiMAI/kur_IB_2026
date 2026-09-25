import React from "react";
import { render, screen } from "@testing-library/react";

import { AuthNav } from "@/components/auth/auth-nav";

describe("AuthNav", () => {
  it("shows sign-in link and mail signup icon for signed-out users", () => {
    render(<AuthNav user={null} onSignOut={async () => {}} />);

    expect(screen.getByRole("link", { name: "Регистрация через Google" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Вход" })).toBeInTheDocument();
  });

  it("shows profile and sign-out for signed-in users", () => {
    render(
      <AuthNav
        user={{ name: "Reader", email: "reader@example.com", role: "USER" }}
        onSignOut={async () => {}}
      />
    );

    expect(screen.getByRole("link", { name: "Reader" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Выйти" })).toBeInTheDocument();
  });
});
