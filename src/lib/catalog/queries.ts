export type CatalogSearchParams = {
  q?: string;
  genre?: string;
  author?: string;
  year?: string;
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
};

export type CatalogFilterOption = {
  slug: string;
  name: string;
};

export type CatalogPageData = {
  books: CatalogBookCard[];
  featuredBooks: CatalogBookCard[];
  filters: {
    genres: CatalogFilterOption[];
    authors: CatalogFilterOption[];
    years: number[];
  };
};
