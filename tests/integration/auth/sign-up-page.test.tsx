import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

vi.mock("@/components/auth/google-auth-button", () => ({
  GoogleAuthButton: ({ mode, enabled }: { mode: string; enabled: boolean }) => (
    <button
      disabled={!enabled}
      aria-label={mode === "signup" ? "Регистрация через Google" : "Вход через Google"}
    />
  )
}));

import SignUpPage from "@/app/auth/sign-up/page";

const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

describe("SignUpPage", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
    process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
  });

  it("shows direct Gmail signup when Google OAuth is configured", () => {
    render(<SignUpPage />);

    expect(screen.getByRole("button", { name: "Регистрация через Google" })).toBeInTheDocument();
    expect(
      screen.getByText(/без отдельного пароля/i)
    ).toBeInTheDocument();
  });
});
