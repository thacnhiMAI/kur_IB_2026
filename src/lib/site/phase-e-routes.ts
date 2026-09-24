export type PhaseERoute = {
  path: string;
  label: string;
  category: "public" | "auth";
  notes: string;
};

export const PHASE_E_PRIORITY_ROUTES: PhaseERoute[] = [
  {
    path: "/",
    label: "Home",
    category: "public",
    notes: "Landing page and first impression route."
  },
  {
    path: "/catalog",
    label: "Catalog",
    category: "public",
    notes: "Heavy card grid with premium visuals and local search."
  },
  {
    path: "/books/design-of-everyday-things",
    label: "Book Detail",
    category: "public",
    notes: "Detail route with hero image, AR entry, reviews, and actions."
  },
  {
    path: "/recommendations",
    label: "Recommendations",
    category: "auth",
    notes: "Dynamic personalized route with snapshot cards."
  }
];

export function getPhaseERouteByPath(path: string): PhaseERoute | null {
  return PHASE_E_PRIORITY_ROUTES.find((route) => route.path === path) ?? null;
}
