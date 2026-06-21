import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  highlightClasses,
  useAnnotations,
  type VerseAnnotation,
} from "@/lib/annotations";
import { NotebookPen, BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "My Notes — Lectio" },
      { name: "description", content: "Your highlights and notes organized by book and chapter." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
    ],
  }),
  component: NotesPage,
});

interface Grouped {
  book: string;
  chapters: { chapter: number; items: VerseAnnotation[] }[];
}

function groupAnnotations(items: VerseAnnotation[]): Grouped[] {
  const byBook = new Map<string, Map<number, VerseAnnotation[]>>();
  for (const ann of items) {
    if (!byBook.has(ann.book)) byBook.set(ann.book, new Map());
    const chMap = byBook.get(ann.book)!;
    if (!chMap.has(ann.chapter)) chMap.set(ann.chapter, []);
    chMap.get(ann.chapter)!.push(ann);
  }
  return Array.from(byBook.entries()).map(([book, chMap]) => ({
    book,
    chapters: Array.from(chMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([chapter, items]) => ({
        chapter,
        items: items.sort((a, b) => a.verse - b.verse),
      })),
  }));
}

function NotesPage() {
  const { all, isLoading, remove } = useAnnotations();
  const grouped = useMemo(() => groupAnnotations(all), [all]);

  const counts = useMemo(() => ({
    total: all.length,
    highlights: all.filter((v) => v.highlight).length,
    notes: all.filter((v) => v.note).length,
  }), [all]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
            <SidebarTrigger />
            <div className="flex flex-col leading-tight">
              <span className="font-scripture text-sm font-medium text-foreground">
                My Notes
              </span>
              <span className="text-xs text-muted-foreground">
                Highlights and notes
              </span>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12">
            <div className="mx-auto w-full max-w-4xl">
              <div className="mb-8 grid grid-cols-3 gap-3">
                <Stat label="Saved" value={counts.total} />
                <Stat label="Highlights" value={counts.highlights} />
                <Stat label="Notes" value={counts.notes} />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : grouped.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-8">
                  {grouped.map(({ book, chapters }) => (
                    <section
                      key={book}
                      className="rounded-xl border border-border bg-card p-6 shadow-sm"
                    >
                      <h2 className="font-scripture mb-4 text-2xl font-semibold text-foreground">
                        {book}
                      </h2>
                      <div className="space-y-6">
                        {chapters.map(({ chapter, items }) => (
                          <div key={chapter}>
                            <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Chapter {chapter}
                            </h3>
                            <ul className="space-y-3">
                              {items.map((ann) => (
                                <li
                                  key={`${ann.book}-${ann.chapter}-${ann.verse}`}
                                  className="group rounded-lg border border-border/60 bg-background/60 p-4 transition-colors hover:border-border"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="font-sans text-xs font-semibold text-primary">
                                      {ann.book} {ann.chapter}:{ann.verse}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {ann.note && (
                                        <NotebookPen className="h-3.5 w-3.5 text-primary/70" />
                                      )}
                                      <button
                                        onClick={() => remove(ann.book, ann.chapter, ann.verse)}
                                        className="ml-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                  <p
                                    className={cn(
                                      "font-scripture text-base leading-relaxed text-foreground sm:text-lg",
                                      ann.highlight && cn("inline rounded px-1", highlightClasses[ann.highlight]),
                                    )}
                                  >
                                    {ann.text}
                                  </p>
                                  {ann.note && (
                                    <p className="mt-3 rounded-md border-l-2 border-primary/40 bg-muted/50 px-3 py-2 font-scripture text-sm italic text-foreground/80">
                                      {ann.note}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-scripture mt-1 text-3xl font-semibold text-foreground">
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
        <BookOpen className="h-7 w-7 text-primary" />
      </div>
      <h2 className="font-scripture text-xl font-semibold text-foreground">
        No notes yet
      </h2>
      <p className="mt-2 max-w-sm font-sans text-sm text-muted-foreground">
        Open the Bible Reader, tap a verse, then highlight it or leave a note. Your reflections will gather here.
      </p>
      <Button asChild className="mt-5">
        <Link to="/">Open Bible Reader</Link>
      </Button>
    </div>
  );
}
