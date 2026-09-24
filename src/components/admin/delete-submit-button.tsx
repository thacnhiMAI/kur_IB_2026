"use client";

import React from "react";
import { useFormStatus } from "react-dom";

type DeleteSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  confirmMessage: string;
  disabled?: boolean;
};

export function DeleteSubmitButton({
  idleLabel,
  pendingLabel,
  confirmMessage,
  disabled = false
}: DeleteSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      className="rounded-lg border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-400 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
