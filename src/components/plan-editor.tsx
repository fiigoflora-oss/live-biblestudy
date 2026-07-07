import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export interface PlanItem {
  id: string;
  day_number: number;
  title: string;
  book: string;
  chapter: number;
}

interface Props {
  groupId: string;
  plan: PlanItem[];
  onChanged: () => void;
}

export function PlanEditor({ groupId, plan, onChanged }: Props) {
  const [creating, setCreating] = useState(false);
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editBook, setEditBook] = useState("");
  const [editChapter, setEditChapter] = useState("");

  const add = async () => {
    if (!book.trim() || !chapter.trim()) {
      toast.error("Book and chapter are required");
      return;
    }
    setBusy(true);
    const nextDay = (plan[plan.length - 1]?.day_number ?? 0) + 1;
    const chapterNum = parseInt(chapter, 10);
    const { error } = await supabase.from("reading_plan_items").insert({
      group_id: groupId,
      day_number: nextDay,
      title: `${book.trim()} ${chapterNum}`,
      book: book.trim(),
      chapter: chapterNum,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setBook(""); setChapter(""); setCreating(false);
      onChanged();
    }
  };

  const startEdit = (item: PlanItem) => {
    setEditId(item.id);
    setEditBook(item.book);
    setEditChapter(String(item.chapter));
  };

  const saveEdit = async (item: PlanItem) => {
    if (!editBook.trim() || !editChapter.trim()) return;
    const chapterNum = parseInt(editChapter, 10);
    const { error } = await supabase.from("reading_plan_items").update({
      book: editBook.trim(),
      chapter: chapterNum,
      title: `${editBook.trim()} ${chapterNum}`,
    }).eq("id", item.id);
    if (error) toast.error(error.message);
    else { setEditId(null); onChanged(); }
  };

  const remove = async (item: PlanItem) => {
    if (!confirm(`Remove Day ${item.day_number} (${item.title})?`)) return;
    const { error } = await supabase.from("reading_plan_items").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else onChanged();
  };

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {plan.map((item) =>
        editId === item.id ? (
          <div key={item.id} className="flex items-center gap-1">
            <Input value={editBook} onChange={(e) => setEditBook(e.target.value)} placeholder="Book" className="h-8 text-xs" />
            <Input value={editChapter} onChange={(e) => setEditChapter(e.target.value)} placeholder="Ch" type="number" className="h-8 w-14 text-xs" />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(item)}><Check className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <div key={item.id} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Day {item.day_number} · {item.title}</span>
            <span className="flex items-center gap-0.5">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(item)}><Pencil className="h-3 w-3" /></Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => remove(item)}><Trash2 className="h-3 w-3" /></Button>
            </span>
          </div>
        ),
      )}
      {creating ? (
        <div className="flex items-center gap-1">
          <Input value={book} onChange={(e) => setBook(e.target.value)} placeholder="Book" className="h-8 text-xs" />
          <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Ch" type="number" className="h-8 w-14 text-xs" />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={add} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCreating(false)}><X className="h-3.5 w-3.5" /></Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> Add day
        </Button>
      )}
    </div>
  );
}
