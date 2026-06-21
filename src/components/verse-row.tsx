import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, BookmarkCheck, NotebookPen, Trash2 } from "lucide-react";
import {
  highlightClasses,
  useAnnotations,
  type HighlightColor,
} from "@/lib/annotations";
import { cn } from "@/lib/utils";

interface Props {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

const colorSwatch: Record<HighlightColor, string> = {
  yellow: "bg-[oklch(0.9_0.15_95)]",
  green: "bg-[oklch(0.82_0.14_150)]",
  blue: "bg-[oklch(0.78_0.11_240)]",
};

export function VerseRow({ book, chapter, verse, text }: Props) {
  const { get, update, remove } = useAnnotations();
  const ann = get(book, chapter, verse);
  const [open, setOpen] = useState(false);
  const [draftNote, setDraftNote] = useState(ann?.note ?? "");
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  const setHighlight = (color: HighlightColor) => {
    update(book, chapter, verse, text, {
      highlight: ann?.highlight === color ? undefined : color,
    });
  };

  const toggleBookmark = () => {
    update(book, chapter, verse, text, { bookmarked: !ann?.bookmarked });
  };

  const saveNote = () => {
    update(book, chapter, verse, text, { note: draftNote.trim() || undefined });
    setShowNoteEditor(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setDraftNote(ann?.note ?? "");
          setShowNoteEditor(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <p
          className={cn(
            "cursor-pointer rounded-md px-1 py-0.5 -mx-1 transition-colors hover:bg-accent/40",
            ann?.highlight && highlightClasses[ann.highlight],
          )}
        >
          <sup className="mr-1.5 font-sans text-xs font-semibold text-primary/70">
            {verse}
          </sup>
          {text}
          {ann?.note && (
            <NotebookPen className="ml-1.5 inline h-3.5 w-3.5 align-baseline text-primary/70" />
          )}
          {ann?.bookmarked && (
            <BookmarkCheck className="ml-1 inline h-3.5 w-3.5 align-baseline text-primary/70" />
          )}
        </p>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-sans text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {book} {chapter}:{verse}
          </span>
          {(ann?.highlight || ann?.note || ann?.bookmarked) && (
            <button
              onClick={() => {
                remove(book, chapter, verse);
                setOpen(false);
              }}
              className="text-muted-foreground transition-colors hover:text-destructive"
              aria-label="Clear annotations"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mb-3">
          <p className="mb-1.5 font-sans text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Highlight
          </p>
          <div className="flex gap-2">
            {(Object.keys(colorSwatch) as HighlightColor[]).map((c) => (
              <button
                key={c}
                onClick={() => setHighlight(c)}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-all",
                  colorSwatch[c],
                  ann?.highlight === c
                    ? "border-primary scale-110"
                    : "border-border hover:scale-105",
                )}
                aria-label={`Highlight ${c}`}
              />
            ))}
          </div>
        </div>

        {showNoteEditor ? (
          <div className="mb-2">
            <Textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="Write your reflection..."
              className="min-h-20 font-sans text-sm"
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNoteEditor(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveNote}>Save note</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setShowNoteEditor(true)}
            >
              <NotebookPen className="mr-1.5 h-3.5 w-3.5" />
              {ann?.note ? "Edit note" : "Add note"}
            </Button>
            <Button
              variant={ann?.bookmarked ? "default" : "outline"}
              size="sm"
              onClick={toggleBookmark}
              aria-label="Bookmark"
            >
              <Bookmark className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {ann?.note && !showNoteEditor && (
          <p className="mt-3 rounded-md bg-muted/60 p-2 font-scripture text-sm italic text-foreground/80">
            {ann.note}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
