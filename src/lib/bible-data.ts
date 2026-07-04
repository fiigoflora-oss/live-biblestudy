type Translation = {
  id: string;
  name: string;
  lang: string;
  bollsCode: string | null;
  bssCode?: string | null;
};

export const translations: Translation[] = [
  { id: "KJV", name: "King James Version", lang: "en", bollsCode: "KJV" },
  { id: "ESV", name: "English Standard Version", lang: "en", bollsCode: "ESV" },
  { id: "NIV", name: "New International Version", lang: "en", bollsCode: "NIV2011" },
  { id: "NASB", name: "New American Standard Bible", lang: "en", bollsCode: "NASB" },
  { id: "NKJV", name: "New King James Version", lang: "en", bollsCode: "NKJV" },
  { id: "WEB", name: "World English Bible", lang: "en", bollsCode: "WEB" },
  { id: "YLT", name: "Young's Literal Translation", lang: "en", bollsCode: "YLT" },
  { id: "ASV", name: "American Standard Version", lang: "en", bollsCode: "ASV" },
  { id: "AMH", name: "Amharic Haile Selassie 1962", lang: "am", bollsCode: null, bssCode: "am_amh" },
];

// `id` is the bolls.life book id (1 = Genesis ... 66 = Revelation)
export const books = [
  { name: "Genesis", chapters: 50, id: 1 },
  { name: "Exodus", chapters: 40, id: 2 },
  { name: "Leviticus", chapters: 27, id: 3 },
  { name: "Numbers", chapters: 36, id: 4 },
  { name: "Deuteronomy", chapters: 34, id: 5 },
  { name: "Joshua", chapters: 24, id: 6 },
  { name: "Judges", chapters: 21, id: 7 },
  { name: "Ruth", chapters: 4, id: 8 },
  { name: "1 Samuel", chapters: 31, id: 9 },
  { name: "2 Samuel", chapters: 24, id: 10 },
  { name: "1 Kings", chapters: 22, id: 11 },
  { name: "2 Kings", chapters: 25, id: 12 },
  { name: "1 Chronicles", chapters: 29, id: 13 },
  { name: "2 Chronicles", chapters: 36, id: 14 },
  { name: "Ezra", chapters: 10, id: 15 },
  { name: "Nehemiah", chapters: 13, id: 16 },
  { name: "Esther", chapters: 10, id: 17 },
  { name: "Job", chapters: 42, id: 18 },
  { name: "Psalms", chapters: 150, id: 19 },
  { name: "Proverbs", chapters: 31, id: 20 },
  { name: "Ecclesiastes", chapters: 12, id: 21 },
  { name: "Song of Solomon", chapters: 8, id: 22 },
  { name: "Isaiah", chapters: 66, id: 23 },
  { name: "Jeremiah", chapters: 52, id: 24 },
  { name: "Lamentations", chapters: 5, id: 25 },
  { name: "Ezekiel", chapters: 48, id: 26 },
  { name: "Daniel", chapters: 12, id: 27 },
  { name: "Hosea", chapters: 14, id: 28 },
  { name: "Joel", chapters: 3, id: 29 },
  { name: "Amos", chapters: 9, id: 30 },
  { name: "Obadiah", chapters: 1, id: 31 },
  { name: "Jonah", chapters: 4, id: 32 },
  { name: "Micah", chapters: 7, id: 33 },
  { name: "Nahum", chapters: 3, id: 34 },
  { name: "Habakkuk", chapters: 3, id: 35 },
  { name: "Zephaniah", chapters: 3, id: 36 },
  { name: "Haggai", chapters: 2, id: 37 },
  { name: "Zechariah", chapters: 14, id: 38 },
  { name: "Malachi", chapters: 4, id: 39 },
  { name: "Matthew", chapters: 28, id: 40 },
  { name: "Mark", chapters: 16, id: 41 },
  { name: "Luke", chapters: 24, id: 42 },
  { name: "John", chapters: 21, id: 43 },
  { name: "Acts", chapters: 28, id: 44 },
  { name: "Romans", chapters: 16, id: 45 },
  { name: "1 Corinthians", chapters: 16, id: 46 },
  { name: "2 Corinthians", chapters: 13, id: 47 },
  { name: "Galatians", chapters: 6, id: 48 },
  { name: "Ephesians", chapters: 6, id: 49 },
  { name: "Philippians", chapters: 4, id: 50 },
  { name: "Colossians", chapters: 4, id: 51 },
  { name: "1 Thessalonians", chapters: 5, id: 52 },
  { name: "2 Thessalonians", chapters: 3, id: 53 },
  { name: "1 Timothy", chapters: 6, id: 54 },
  { name: "2 Timothy", chapters: 4, id: 55 },
  { name: "Titus", chapters: 3, id: 56 },
  { name: "Philemon", chapters: 1, id: 57 },
  { name: "Hebrews", chapters: 13, id: 58 },
  { name: "James", chapters: 5, id: 59 },
  { name: "1 Peter", chapters: 5, id: 60 },
  { name: "2 Peter", chapters: 3, id: 61 },
  { name: "1 John", chapters: 5, id: 62 },
  { name: "2 John", chapters: 1, id: 63 },
  { name: "3 John", chapters: 1, id: 64 },
  { name: "Jude", chapters: 1, id: 65 },
  { name: "Revelation", chapters: 22, id: 66 },
];

function stripMarkup(text: string): string {
  // bolls.life embeds Strong's numbers as <S>1234</S> and italics as <i>…</i>
  return text
    .replace(/<S>\d+<\/S>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWithRetry(url: string, signal?: AbortSignal, retries = 2): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal });
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      lastErr = err;
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
  }
  throw lastErr instanceof Error ? lastErr : new Error("Network error");
}

const cache = new Map<string, string[]>();

export async function fetchChapter(
  book: string,
  chapter: number,
  translation = "KJV",
  signal?: AbortSignal,
): Promise<string[]> {
  const cacheKey = `${translation}:${book}-${chapter}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const trMeta = translations.find((t) => t.id === translation);
  const bookMeta = books.find((b) => b.name === book);
  if (!trMeta || !bookMeta) {
    throw new Error(`Unknown book or translation: ${book} / ${translation}`);
  }

  // Primary: bolls.life (broad translation catalog)
  if (trMeta.bollsCode) {
    const res = await fetchWithRetry(
      `https://bolls.life/get-text/${trMeta.bollsCode}/${bookMeta.id}/${chapter}/`,
      signal,
    );
    const data: Array<{ verse: number; text: string }> = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const verses = data
        .sort((a, b) => a.verse - b.verse)
        .map((v) => stripMarkup(v.text));
      cache.set(cacheKey, verses);
      return verses;
    }
    throw new Error(`Empty passage returned for ${book} ${chapter} (${translation}).`);
  }

  // Secondary: biblesupersearch (for translations bolls doesn't have, e.g. Amharic)
  if (trMeta.bssCode) {
    const ref = encodeURIComponent(`${book} ${chapter}`);
    const res = await fetchWithRetry(
      `https://api.biblesupersearch.com/api?bible=${trMeta.bssCode}&reference=${ref}`,
      signal,
    );
    const data = await res.json();
    const chapterMap = data?.results?.[0]?.verses?.[trMeta.bssCode]?.[String(chapter)];
    if (chapterMap && typeof chapterMap === "object") {
      const entries = Object.entries(chapterMap as Record<string, { verse: number; text: string }>)
        .map(([, v]) => v)
        .sort((a, b) => a.verse - b.verse)
        .map((v) => stripMarkup(v.text).replace(/^¶\s*/, ""));
      if (entries.length > 0) {
        cache.set(cacheKey, entries);
        return entries;
      }
    }
    throw new Error(`Empty passage returned for ${book} ${chapter} (${translation}).`);
  }

  throw new Error(`No API configured for translation ${translation}.`);
}

export function getTranslationLang(id: string): string {
  return translations.find((t) => t.id === id)?.lang ?? "en";
}
