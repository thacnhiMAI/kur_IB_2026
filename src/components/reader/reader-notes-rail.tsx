"use client";

import { BookOpenText } from "lucide-react";

export type ReaderNoteItem = {
  id: string;
  page: number;
  note: string | null;
  color: string;
};

function preview(note: string | null) {
  const words = (note ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "Highlight";
  return words.slice(0, 5).join(" ") + (words.length > 5 ? "…" : "");
}

export function ReaderNotesRail({
  open,
  dimmed,
  notes,
  onOpenNote
}: {
  open: boolean;
  dimmed: boolean;
  notes: ReaderNoteItem[];
  onOpenNote: (note: ReaderNoteItem) => void;
}) {
  if (!open) return null;

  return (
    <aside className={`reader-notes-rail is-open ${dimmed ? "is-dimmed" : ""}`} aria-label="Заметки">
      <div className="reader-notes-list">
        <div className="reader-rail-title"><BookOpenText size={16} /><span>Заметки</span></div>
        {notes.length ? notes.map((note) => (
          <button key={note.id} type="button" className="reader-note-row" onClick={() => onOpenNote(note)}>
            <span className={`reader-note-dot is-${note.color}`} />
            <span className="reader-note-copy">{preview(note.note)}</span>
            <span className="reader-note-page">{note.page}</span>
          </button>
        )) : <p className="reader-rail-empty">Пока нет заметок.</p>}
      </div>
    </aside>
  );
}
