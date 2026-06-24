export const translations = [
  { id: "KJV", name: "King James Version", lang: "en", bollsCode: "KJV" },
  { id: "ESV", name: "English Standard Version", lang: "en", bollsCode: "ESV" },
  { id: "NIV", name: "New International Version", lang: "en", bollsCode: "NIV2011" },
  { id: "NASB", name: "New American Standard Bible", lang: "en", bollsCode: "NASB" },
  { id: "AMH", name: "Amharic Haile Selassie 1962", lang: "am", bollsCode: null as string | null },
];

// `id` is the bolls.life book id (1 = Genesis ... 66 = Revelation)
export const books = [
  { name: "Genesis", chapters: 50, id: 1 },
  { name: "Exodus", chapters: 40, id: 2 },
  { name: "Leviticus", chapters: 27, id: 3 },
  { name: "Numbers", chapters: 36, id: 4 },
  { name: "Deuteronomy", chapters: 34, id: 5 },
  { name: "Joshua", chapters: 24, id: 6 },
  { name: "Psalms", chapters: 150, id: 19 },
  { name: "Proverbs", chapters: 31, id: 20 },
  { name: "Isaiah", chapters: 66, id: 23 },
  { name: "Matthew", chapters: 28, id: 40 },
  { name: "Mark", chapters: 16, id: 41 },
  { name: "Luke", chapters: 24, id: 42 },
  { name: "John", chapters: 21, id: 43 },
  { name: "Acts", chapters: 28, id: 44 },
  { name: "Romans", chapters: 16, id: 45 },
  { name: "1 Corinthians", chapters: 16, id: 46 },
  { name: "Galatians", chapters: 6, id: 48 },
  { name: "Ephesians", chapters: 6, id: 49 },
  { name: "Philippians", chapters: 4, id: 50 },
  { name: "Hebrews", chapters: 13, id: 58 },
  { name: "James", chapters: 5, id: 59 },
  { name: "1 John", chapters: 5, id: 62 },
  { name: "Revelation", chapters: 22, id: 66 },
];

// Local fallback used when a translation has no public API (e.g. Amharic).
const samplePassages: Record<string, string[]> = {
  "AMH:Mark-1": [
    "የእግዚአብሔር ልጅ የኢየሱስ ክርስቶስ ወንጌል መጀመሪያ።",
    "በነቢዩ በኢሳይያስ፦ እነሆ፥ መንገድህን የሚጠርግ መልክተኛዬን በፊትህ እልካለሁ ተብሎ እንደ ተጻፈ፥",
    "በምድረ በዳ የሚጮኽ ድምፅ፦ የጌታን መንገድ አዘጋጁ፥ ጥርጊያውንም አቅኑ የሚል ነበረ።",
    "ዮሐንስ በምድረ በዳ እያጠመቀ ለኃጢአትም ስርየት የንስሐን ጥምቀት እየሰበከ መጣ።",
    "የይሁዳም አገር ሁሉ የኢየሩሳሌምም ሰዎች ሁሉ ወደ እርሱ ይወጡ ነበር፥ ኃጢአታቸውንም እየተናዘዙ በዮርዳኖስ ወንዝ ከእርሱ ይጠመቁ ነበር።",
    "ዮሐንስም የግመል ጠጉር ለብሶ በወገቡም የቁርበት መታጠቂያ ታጥቆ አንበጣና የበረሀ ማርም ይበላ ነበር።",
    "እርሱም፦ ከእኔ የሚበረታ ይመጣል፥ የጫማውን ቀለበት ጎንበስ ብዬ ልፈታ የማይገባኝ።",
    "እኔ በውኃ አጠመቅኋችሁ፥ እርሱ ግን በመንፈስ ቅዱስ ያጠምቃችኋል ብሎ ሰበከ።",
    "በዚያም ወራት ኢየሱስ ከገሊላ ናዝሬት መጣ፥ በዮርዳኖስም ከዮሐንስ ተጠመቀ።",
    "ወዲያውም ከውኃው ሲወጣ ሰማያት ተከፍተው መንፈስ እንደ ርግብ ሲወርድበት አየ።",
    "ድምፅም ከሰማይ መጣ፦ የምወድህ ልጄ አንተ ነህ፥ በአንተ ደስ ይለኛል አለ።",
    "ወዲያውም መንፈስ ወደ ምድረ በዳ አወጣው።",
  ],
};

function stripMarkup(text: string): string {
  // bolls.life embeds Strong's numbers as <S>1234</S> and italics as <i>…</i>
  return text
    .replace(/<S>\d+<\/S>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

  if (trMeta?.bollsCode && bookMeta) {
    try {
      const res = await fetch(
        `https://bolls.life/get-text/${trMeta.bollsCode}/${bookMeta.id}/${chapter}/`,
        { signal },
      );
      if (res.ok) {
        const data: Array<{ verse: number; text: string }> = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const verses = data
            .sort((a, b) => a.verse - b.verse)
            .map((v) => stripMarkup(v.text));
          cache.set(cacheKey, verses);
          return verses;
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      // fall through to local fallback
    }
  }

  // Local fallback (Amharic placeholders, or any failed fetch)
  const localized = samplePassages[cacheKey];
  if (localized) {
    cache.set(cacheKey, localized);
    return localized;
  }

  if (trMeta?.lang === "am") {
    return Array.from({ length: 10 }, (_, i) =>
      `ይህ ${book} ምዕራፍ ${chapter} ቁጥር ${i + 1} ላይ የተቀመጠ ምሳሌ ጥቅስ ነው። ሙሉው የአማርኛ መጽሐፍ ቅዱስ ጽሑፍ በቅርቡ ይጫናል።`,
    );
  }
  return [`Unable to load ${book} ${chapter} (${translation}). Please check your connection and try again.`];
}

export function getTranslationLang(id: string): string {
  return translations.find((t) => t.id === id)?.lang ?? "en";
}
