export type SearchableBook = {
  id: number;
  title?: string;
  title_th?: string;
  title_en?: string;
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
  tags?: string[] | string;
  tag_names?: string[] | string;
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

const compactText = (value: string) => value.replace(/\s+/g, "");

const splitValues = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String);
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const getBookTags = (book: SearchableBook) => {
  return [...splitValues(book.tags), ...splitValues(book.tag_names)];
};

const getSearchBlob = (book: SearchableBook) => {
  return [
    book.title,
    book.title_th,
    book.title_en,
    book.author,
    book.author_name,
    book.category_name,
    book.description,
    book.content_type,
    book.access_type,
    ...getBookTags(book),
  ]
    .map(normalizeText)
    .join(" ");
};

const getSearchFields = (book: SearchableBook) => {
  return [
    book.title,
    book.title_th,
    book.title_en,
    book.author,
    book.author_name,
    book.category_name,
    book.description,
    book.content_type,
    book.access_type,
    ...getBookTags(book),
  ].map(normalizeText);
};

const isSubsequenceMatch = (target: string, query: string) => {
  if (!query) return true;
  if (!target || query.length < 2) return false;

  let queryIndex = 0;
  for (const character of target) {
    if (character === query[queryIndex]) queryIndex += 1;
    if (queryIndex === query.length) return true;
  }

  return false;
};

const matchesSearchPart = (book: SearchableBook, part: string) => {
  const fields = getSearchFields(book);
  const compactPart = compactText(part);

  return fields.some((field) => {
    const compactField = compactText(field);
    return (
      field.includes(part) ||
      compactField.includes(compactPart) ||
      isSubsequenceMatch(compactField, compactPart)
    );
  });
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
      return parts.every((part) => matchesSearchPart(book, part));
    })
    .sort((a, b) => getBookSearchScore(b, keyword) - getBookSearchScore(a, keyword));
};

export const getBookSearchScore = (book: SearchableBook, query = "") => {
  const keyword = normalizeText(query);
  if (!keyword) return 0;

  const title = normalizeText([book.title, book.title_th, book.title_en].filter(Boolean).join(" "));
  const author = normalizeText(book.author || book.author_name);
  const category = normalizeText(book.category_name);
  const tags = getBookTags(book).map(normalizeText);
  const tagBlob = tags.join(" ");
  const blob = getSearchBlob(book);
  const compactKeyword = compactText(keyword);
  const compactTitle = compactText(title);
  const compactAuthor = compactText(author);
  const compactCategory = compactText(category);
  const compactTagBlob = compactText(tagBlob);
  const compactBlob = compactText(blob);

  let score = 0;
  if (title === keyword) score += 120;
  if (title.startsWith(keyword)) score += 90;
  if (title.includes(keyword)) score += 70;
  if (compactTitle.includes(compactKeyword)) score += 55;
  if (author.includes(keyword)) score += 35;
  if (compactAuthor.includes(compactKeyword)) score += 30;
  if (category.includes(keyword)) score += 25;
  if (compactCategory.includes(compactKeyword)) score += 22;
  if (tags.some((tag) => tag === keyword)) score += 65;
  if (tagBlob.includes(keyword)) score += 32;
  if (compactTagBlob.includes(compactKeyword)) score += 28;
  if (blob.includes(keyword)) score += 10;
  if (compactBlob.includes(compactKeyword)) score += 8;
  if (isSubsequenceMatch(compactTitle, compactKeyword)) score += 18;
  if (isSubsequenceMatch(compactAuthor, compactKeyword)) score += 10;
  if (isSubsequenceMatch(compactCategory, compactKeyword)) score += 8;

  for (const part of keyword.split(/\s+/).filter(Boolean)) {
    const compactPart = compactText(part);
    if (title.includes(part) || compactTitle.includes(compactPart)) score += 12;
    if (author.includes(part) || compactAuthor.includes(compactPart)) score += 8;
    if (category.includes(part) || compactCategory.includes(compactPart)) score += 6;
    if (tagBlob.includes(part) || compactTagBlob.includes(compactPart)) score += 10;
    if (isSubsequenceMatch(compactTitle, compactPart)) score += 4;
  }

  return score;
};
