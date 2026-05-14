export type SearchableBook = {
  id: number;
  title?: string;
  author?: string;
  author_name?: string;
  category_name?: string;
  description?: string;
  content_type?: string;
  access_type?: string;
  price?: number | string;
  episode_count?: number;
  cover_url?: string;
  cover_image?: string;
};

export type BookFilters = {
  contentType?: string;
  accessType?: string;
  category?: string | string[];
};

const normalizeText = (value: unknown) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
};

const getSearchBlob = (book: SearchableBook) => {
  return [
    book.title,
    book.author,
    book.author_name,
    book.category_name,
    book.description,
    book.content_type,
    book.access_type,
  ]
    .map(normalizeText)
    .join(" ");
};

export const uniqueBookCategories = (books: SearchableBook[]) => {
  return [...new Set(books.map((book) => book.category_name).filter(Boolean))]
    .map(String)
    .sort((a, b) => a.localeCompare(b, "th"));
};

export const filterBooks = (
  books: SearchableBook[],
  query = "",
  filters: BookFilters = {},
) => {
  const keyword = normalizeText(query);
  const parts = keyword.split(/\s+/).filter(Boolean);
  const contentType = filters.contentType || "all";
  const accessType = filters.accessType || "all";
  const category = filters.category || "all";
  const categorySet = Array.isArray(category) ? new Set(category) : null;

  return books
    .filter((book) => {
      if (contentType !== "all" && book.content_type !== contentType) return false;
      if (accessType !== "all" && book.access_type !== accessType) return false;
      if (categorySet && !categorySet.has(String(book.category_name || ""))) {
        return false;
      }
      if (!categorySet && category !== "all" && book.category_name !== category) {
        return false;
      }

      if (parts.length === 0) return true;
      const blob = getSearchBlob(book);
      return parts.every((part) => blob.includes(part));
    })
    .sort((a, b) => getBookSearchScore(b, keyword) - getBookSearchScore(a, keyword));
};

export const getBookSearchScore = (book: SearchableBook, query = "") => {
  const keyword = normalizeText(query);
  if (!keyword) return 0;

  const title = normalizeText(book.title);
  const author = normalizeText(book.author || book.author_name);
  const category = normalizeText(book.category_name);
  const blob = getSearchBlob(book);

  let score = 0;
  if (title === keyword) score += 120;
  if (title.startsWith(keyword)) score += 90;
  if (title.includes(keyword)) score += 70;
  if (author.includes(keyword)) score += 35;
  if (category.includes(keyword)) score += 25;
  if (blob.includes(keyword)) score += 10;

  for (const part of keyword.split(/\s+/).filter(Boolean)) {
    if (title.includes(part)) score += 12;
    if (author.includes(part)) score += 8;
    if (category.includes(part)) score += 6;
  }

  return score;
};
