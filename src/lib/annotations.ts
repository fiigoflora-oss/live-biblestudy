import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HighlightColor = "yellow" | "green" | "blue";

export interface VerseAnnotation {
  book: string;
  chapter: number;
  verse: number;
  text: string;
  highlight?: HighlightColor;
  note?: string;
}

interface HighlightRow {
  book: string;
  chapter: number;
  verse: number;
  verse_text: string;
  color: HighlightColor;
}
interface NoteRow {
  book: string;
  chapter: number;
  verse: number;
  verse_text: string;
  note_text: string;
}

function verseRef(book: string, chapter: number, verse: number) {
  return `${book} ${chapter}:${verse}`;
}
function keyOf(book: string, chapter: number, verse: number) {
  return `${book}::${chapter}::${verse}`;
}

async function fetchAll() {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { highlights: [] as HighlightRow[], notes: [] as NoteRow[] };

  const [h, n] = await Promise.all([
    supabase.from("highlights").select("book,chapter,verse,verse_text,color").eq("user_id", userId),
    supabase.from("notes").select("book,chapter,verse,verse_text,note_text").eq("user_id", userId),
  ]);
  if (h.error) throw h.error;
  if (n.error) throw n.error;
  return { highlights: (h.data ?? []) as HighlightRow[], notes: (n.data ?? []) as NoteRow[] };
}

export function useAnnotations() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["annotations"],
    queryFn: fetchAll,
  });

  const map = new Map<string, VerseAnnotation>();
  for (const h of data?.highlights ?? []) {
    map.set(keyOf(h.book, h.chapter, h.verse), {
      book: h.book, chapter: h.chapter, verse: h.verse, text: h.verse_text, highlight: h.color,
    });
  }
  for (const n of data?.notes ?? []) {
    const k = keyOf(n.book, n.chapter, n.verse);
    const ex = map.get(k);
    map.set(k, {
      book: n.book, chapter: n.chapter, verse: n.verse, text: n.verse_text,
      highlight: ex?.highlight, note: n.note_text,
    });
  }
  const all = Array.from(map.values());

  const invalidate = () => qc.invalidateQueries({ queryKey: ["annotations"] });

  const setHighlight = useMutation({
    mutationFn: async (args: { book: string; chapter: number; verse: number; text: string; color?: HighlightColor }) => {
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user!.id;
      const ref = verseRef(args.book, args.chapter, args.verse);
      if (!args.color) {
        const { error } = await supabase.from("highlights").delete().match({ user_id, verse_reference: ref });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("highlights").upsert({
          user_id, verse_reference: ref, book: args.book, chapter: args.chapter,
          verse: args.verse, verse_text: args.text, color: args.color,
        }, { onConflict: "user_id,verse_reference" });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const setNote = useMutation({
    mutationFn: async (args: { book: string; chapter: number; verse: number; text: string; note?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user!.id;
      const ref = verseRef(args.book, args.chapter, args.verse);
      if (!args.note) {
        const { error } = await supabase.from("notes").delete().match({ user_id, verse_reference: ref });
        if (error) throw error;
        return;
      }
      const { data: existing } = await supabase
        .from("notes").select("id").eq("user_id", user_id).eq("verse_reference", ref).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("notes")
          .update({ note_text: args.note, verse_text: args.text }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notes").insert({
          user_id, verse_reference: ref, book: args.book, chapter: args.chapter,
          verse: args.verse, verse_text: args.text, note_text: args.note,
        });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const removeAll = useMutation({
    mutationFn: async (args: { book: string; chapter: number; verse: number }) => {
      const { data: u } = await supabase.auth.getUser();
      const user_id = u.user!.id;
      const ref = verseRef(args.book, args.chapter, args.verse);
      const [a, b] = await Promise.all([
        supabase.from("highlights").delete().match({ user_id, verse_reference: ref }),
        supabase.from("notes").delete().match({ user_id, verse_reference: ref }),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
    },
    onSuccess: invalidate,
  });

  const get = useCallback(
    (book: string, chapter: number, verse: number) => map.get(keyOf(book, chapter, verse)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  return {
    all,
    isLoading,
    get,
    setHighlight: (book: string, chapter: number, verse: number, text: string, color?: HighlightColor) =>
      setHighlight.mutate({ book, chapter, verse, text, color }),
    setNote: (book: string, chapter: number, verse: number, text: string, note?: string) =>
      setNote.mutate({ book, chapter, verse, text, note }),
    remove: (book: string, chapter: number, verse: number) =>
      removeAll.mutate({ book, chapter, verse }),
  };
}

export const highlightClasses: Record<HighlightColor, string> = {
  yellow: "bg-[oklch(0.94_0.13_95)]/60 dark:bg-[oklch(0.65_0.15_95)]/40",
  green: "bg-[oklch(0.9_0.12_150)]/55 dark:bg-[oklch(0.6_0.13_150)]/40",
  blue: "bg-[oklch(0.88_0.09_240)]/65 dark:bg-[oklch(0.6_0.12_240)]/45",
};
