export const translations = [
  { id: "KJV", name: "King James Version" },
  { id: "ESV", name: "English Standard Version" },
  { id: "NIV", name: "New International Version" },
  { id: "NASB", name: "New American Standard Bible" },
];

export const books = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Isaiah", chapters: 66 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 John", chapters: 5 },
  { name: "Revelation", chapters: 22 },
];

// Sample passages for demonstration
const samplePassages: Record<string, string[]> = {
  "John-1": [
    "In the beginning was the Word, and the Word was with God, and the Word was God.",
    "The same was in the beginning with God.",
    "All things were made by him; and without him was not any thing made that was made.",
    "In him was life; and the life was the light of men.",
    "And the light shineth in darkness; and the darkness comprehended it not.",
    "There was a man sent from God, whose name was John.",
    "The same came for a witness, to bear witness of the Light, that all men through him might believe.",
    "He was not that Light, but was sent to bear witness of that Light.",
    "That was the true Light, which lighteth every man that cometh into the world.",
    "He was in the world, and the world was made by him, and the world knew him not.",
    "He came unto his own, and his own received him not.",
    "But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name.",
    "Which were born, not of blood, nor of the will of the flesh, nor of the will of man, but of God.",
    "And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth.",
  ],
  "Psalms-23": [
    "The Lord is my shepherd; I shall not want.",
    "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
    "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake.",
    "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.",
    "Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.",
    "Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the Lord for ever.",
  ],
  "Genesis-1": [
    "In the beginning God created the heaven and the earth.",
    "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
    "And God said, Let there be light: and there was light.",
    "And God saw the light, that it was good: and God divided the light from the darkness.",
    "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.",
  ],
};

export function getChapter(book: string, chapter: number): string[] {
  const key = `${book}-${chapter}`;
  if (samplePassages[key]) return samplePassages[key];
  // Placeholder verses
  return Array.from({ length: 12 }, (_, i) =>
    `This is a placeholder verse ${i + 1} for ${book} chapter ${chapter}. In a complete app, this text would be loaded from a Bible API or local data source, presenting the inspired words for reflection and study.`
  );
}
