export type ImportProvider = "open-library" | "google-books";

export type ImportFetchLike = typeof fetch;

export type ImportSourceOptions = {
  fetcher?: ImportFetchLike;
  limitPerQuery?: number;
};

export type GoogleBooksSourceOptions = ImportSourceOptions & {
  apiKey?: string;
};

export type NormalizedImportedBook = {
  title: string;
  subtitle?: string;
  originalTitle?: string;
  description: string;
  authors: string[];
  genres: string[];
  year: number;
  language: string;
  pages?: number;
  publisher?: string;
  isbn10?: string;
  isbn13?: string;
  coverUrl?: string;
  ratingAverage?: number;
  ratingsCount?: number;
  provider: ImportProvider;
  externalId: string;
  sourceUrl?: string;
};

export type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  subtitle?: string;
  first_publish_year?: number;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  subject?: string[];
  language?: string[];
  number_of_pages_median?: number;
  publisher?: string[];
  ratings_average?: number;
  ratings_count?: number;
};

export type OpenLibrarySearchResponse = {
  docs?: OpenLibrarySearchDoc[];
};

export type GoogleBooksIndustryIdentifier = {
  type?: string;
  identifier?: string;
};

export type GoogleBooksVolume = {
  id?: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    description?: string;
    authors?: string[];
    categories?: string[];
    publishedDate?: string;
    language?: string;
    pageCount?: number;
    publisher?: string;
    industryIdentifiers?: GoogleBooksIndustryIdentifier[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    averageRating?: number;
    ratingsCount?: number;
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
  searchInfo?: {
    textSnippet?: string;
  };
};

export type GoogleBooksVolumesResponse = {
  items?: GoogleBooksVolume[];
};
