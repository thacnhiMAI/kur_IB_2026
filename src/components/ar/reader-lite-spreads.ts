import type { ARBookPayload } from "@/lib/ar/types";

export type ReaderLitePanel = {
  eyebrow: string;
  title: string;
  lines: string[];
};

export type ReaderLiteSpread = {
  id: "cover" | "intro" | "summary" | "ar-note";
  left: ReaderLitePanel;
  right: ReaderLitePanel;
};

export function buildReaderLiteSpreads(book: ARBookPayload): ReaderLiteSpread[] {
  return [
    {
      id: "cover",
      left: {
        eyebrow: "Cover",
        title: book.title,
        lines: [book.subtitle ?? "3D Reader Lite", book.authors.join(", ")]
      },
      right: {
        eyebrow: "Preview",
        title: "Open the book",
        lines: ["Use the controls below to browse a few readable preview spreads."]
      }
    },
    {
      id: "intro",
      left: {
        eyebrow: "About",
        title: "About this book",
        lines: [book.description]
      },
      right: {
        eyebrow: "Edition",
        title: "Publication details",
        lines: [
          book.publisher ?? "Publisher unavailable",
          book.edition ?? "Main edition",
          `${book.year}`
        ]
      }
    },
    {
      id: "summary",
      left: {
        eyebrow: "Reading",
        title: "Reading summary",
        lines: [`Language: ${book.language.toUpperCase()}`, `${book.pages} pages`]
      },
      right: {
        eyebrow: "Catalog",
        title: "Why this fallback exists",
        lines: [
          "Immersive AR is unavailable on this device.",
          "This fallback keeps the route readable instead of decorative-only."
        ]
      }
    },
    {
      id: "ar-note",
      left: {
        eyebrow: "Mobile AR",
        title: "Try immersive AR on mobile",
        lines: [
          "Open this route on a supported phone browser to start immersive AR.",
          "Desktop and unsupported devices stay in Reader Lite."
        ]
      },
      right: {
        eyebrow: "Route",
        title: `/ar/books/${book.slug}`,
        lines: ["The same route auto-selects WebXR, 3D Reader Lite, or 2D fallback."]
      }
    }
  ];
}
