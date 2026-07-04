import { useEffect, useMemo, useState } from "react";
import { books, translations, fetchChapter, getTranslationLang } from "@/lib/bible-data";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { VerseRow } from "@/components/verse-row";

export function BibleReader() {
  const [book, setBook] = useState("John");
  const [chapter, setChapter] = useState(1);
  const [translation, setTranslation] = useState("KJV");
  const [verses, setVerses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookMeta = useMemo(() => books.find((b) => b.name === book)!, [book]);
  const lang = getTranslationLang(translation);
  const isEthiopic = lang === "am";

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchChapter(book, chapter, translation, controller.signal)
      .then((v) => {
        setVerses(v);
        setError(null);
      })
      .catch((err: Error) => {
        if (err?.name === "AbortError") return;
        setVerses([]);
        setError(`Couldn't load ${book} ${chapter} (${translation}). Check your connection or try another translation.`);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [book, chapter, translation]);

  const onBookChange = (val: string) => {
    setBook(val);
    setChapter(1);
  };

  const prev = () => setChapter((c) => Math.max(1, c - 1));
  const next = () => setChapter((c) => Math.min(bookMeta.chapters, c + 1));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Book
            </label>
            <Select value={book} onValueChange={onBookChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {books.map((b) => (
                  <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chapter
            </label>
            <Select value={String(chapter)} onValueChange={(v) => setChapter(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {Array.from({ length: bookMeta.chapters }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Translation
            </label>
            <Select value={translation} onValueChange={setTranslation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {translations.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.id} — {t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <article className="rounded-xl border border-border bg-card px-6 py-10 shadow-sm sm:px-12 sm:py-14">
        <header className="mb-8 border-b border-border pb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {translation}
          </p>
          <h1 className="font-scripture mt-2 text-4xl font-semibold text-foreground sm:text-5xl">
            {book} {chapter}
          </h1>
        </header>

        <div
          lang={lang}
          className={cn(
            "space-y-2 text-foreground",
            isEthiopic
              ? "text-xl leading-[2.05] sm:text-[1.35rem] sm:leading-[2.15]"
              : "font-scripture text-lg leading-relaxed sm:text-[1.2rem] sm:leading-[1.9]",
          )}
          style={isEthiopic ? { fontFamily: '"Noto Serif Ethiopic", "Nyala", Georgia, serif' } : undefined}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              <span className="font-scripture text-base italic">Loading scripture…</span>
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
              {error}
            </div>
          ) : (
            verses.map((v, i) => (
              <VerseRow
                key={`${book}-${chapter}-${i}`}
                book={book}
                chapter={chapter}
                verse={i + 1}
                text={v}
              />
            ))
          )}
        </div>

        <footer className="mt-10 flex items-center justify-between border-t border-border pt-6">
          <Button variant="ghost" onClick={prev} disabled={chapter === 1}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <span className="font-scripture text-sm italic text-muted-foreground">
            Chapter {chapter} of {bookMeta.chapters}
          </span>
          <Button variant="ghost" onClick={next} disabled={chapter === bookMeta.chapters}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </footer>
      </article>
    </div>
  );
}
