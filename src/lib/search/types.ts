export type SearchableItem = {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string;
  tags: string[];
  reason: string;
};

export type VoiceSupportState =
  | { status: "supported" }
  | { status: "unsupported"; message: string }
  | { status: "error"; message: string };
