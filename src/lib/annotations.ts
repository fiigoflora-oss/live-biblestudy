import { useEffect, useState, useCallback } from "react";

export type HighlightColor = "yellow" | "green" | "blue";

export interface VerseAnnotation {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  highlight?: HighlightColor;
  note?: string;
  bookmarked?: boolean;
  updatedAt: number;
}

const KEY = "lectio:annotations:v1";

function keyOf(book: string, chapter: number, verse: number) {
  return `${book}::${chapter}::${verse}`;
}

function load(): Record<string, VerseAnnotation> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(data: Record<string, VerseAnnotation>) {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("lectio:annotations-changed"));
}

export function useAnnotations() {
  const [data, setData] = useState<Record<string, VerseAnnotation>>({});

  useEffect(() => {
    setData(load());
    const onChange = () => setData(load());
    window.addEventListener("lectio:annotations-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("lectio:annotations-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = useCallback(
    (
      book: string,
      chapter: number,
      verse: number,
      text: string,
      patch: Partial<Pick<VerseAnnotation, "highlight" | "note" | "bookmarked">>,
    ) => {
      const current = load();
      const k = keyOf(book, chapter, verse);
      const next: VerseAnnotation = {
        ...current[k],
        book,
        chapter,
        verse,
        text,
        ...patch,
        updatedAt: Date.now(),
      };
      // If nothing meaningful set, remove
      if (!next.highlight && !next.note && !next.bookmarked) {
        delete current[k];
      } else {
        current[k] = next;
      }
      save(current);
    },
    [],
  );

  const remove = useCallback((book: string, chapter: number, verse: number) => {
    const current = load();
    delete current[keyOf(book, chapter, verse)];
    save(current);
  }, []);

  const get = useCallback(
    (book: string, chapter: number, verse: number): VerseAnnotation | undefined =>
      data[keyOf(book, chapter, verse)],
    [data],
  );

  return { data, update, remove, get };
}

export const highlightClasses: Record<HighlightColor, string> = {
  yellow: "bg-[oklch(0.94_0.13_95)]/60 dark:bg-[oklch(0.65_0.15_95)]/40",
  green: "bg-[oklch(0.9_0.12_150)]/55 dark:bg-[oklch(0.6_0.13_150)]/40",
  blue: "bg-[oklch(0.88_0.09_240)]/65 dark:bg-[oklch(0.6_0.12_240)]/45",
};
