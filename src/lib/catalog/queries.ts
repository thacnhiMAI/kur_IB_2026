export type CatalogPaginationDirection = "next" | "prev";

export type CatalogSearchParams = {
  q?: string;
  genre?: string;
  author?: string;
  year?: string;
  cursor?: string;
  direction?: CatalogPaginationDirection;
};

export type CatalogBookCoverAsset = {
  publicUrl: string;
  dominantColor: string | null;
  blurDataUrl: string | null;
  status: string;
};

export type CatalogBookRecord = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  coverImage: string | null;
  year: number;
  publisher: string | null;
  edition: string | null;
  isbn13: string | null;
  language: string;
  pages: number;
  ratingAverage: number | null;
  ratingsCount: number | null;
  isFeatured: boolean;
  authors: Array<{
    author: CatalogFilterOption;
  }>;
  genres: Array<{
    genre: CatalogFilterOption;
  }>;
  coverAssets: CatalogBookCoverAsset[];
  contents: Array<{
    id: string;
    sourceType: "PDF" | "EXTERNAL_LINK";
    status: "READY" | "PROCESSING" | "FAILED";
    isPrimary: boolean;
    storagePath: string | null;
    publicUrl: string | null;
    externalUrl: string | null;
  }>;
};

export type CatalogBookCard = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  year: number;
  coverImage: string | null;
  dominantColor: string;
  blurDataUrl: string | null;
  authors: string[];
  genres: string[];
  isFeatured: boolean;
  readingMode: "internal" | "external" | "none";
  readHref: string | null;
  readLabel: "Читать" | "Открыть внешний источник" | null;
  progressPercent: number;
  readingStatus: "not-started" | "in-progress" | "completed";
};

export type CatalogBookDetail = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  year: number;
  coverImage: string | null;
  dominantColor: string | null;
  blurDataUrl: string | null;
  authors: string[];
  genres: string[];
  publisher: string | null;
  edition: string | null;
  isbn13: string | null;
  language: string;
  pages: number;
  ratingAverage: number | null;
  ratingsCount: number | null;
  isFeatured: boolean;
  readingMode: "internal" | "external" | "none";
  readHref: string | null;
  readLabel: "Читать" | "Открыть внешний источник" | null;
  primaryContentId: string | null;
  externalReadingUrl?: string;
};

export type CatalogFilterOption = {
  slug: string;
  name: string;
};

export type CatalogPagination = {
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
  previousCursor: string | null;
};

export type CatalogPageData = {
  books: CatalogBookCard[];
  featuredBooks: CatalogBookCard[];
  filters: {
    genres: CatalogFilterOption[];
    authors: CatalogFilterOption[];
    years: number[];
  };
  pagination: CatalogPagination;
};
