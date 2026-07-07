import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { HandHeart, Loader2, Send, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PrayerRequest {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface Props {
  groupId: string;
  isMember: boolean;
  isAdmin: boolean;
  userId: string | null;
}

export function PrayerRequests({ groupId, isMember, isAdmin, userId }: Props) {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [supports, setSupports] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data: prs } = await supabase
      .from("prayer_requests")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    const list = (prs ?? []) as PrayerRequest[];
    setRequests(list);

    if (list.length) {
      const ids = list.map((r) => r.id);
      const { data: sup } = await supabase
        .from("prayer_supports")
        .select("prayer_id, user_id")
        .in("prayer_id", ids);
      const tally: Record<string, { count: number; mine: boolean }> = {};
      list.forEach((r) => (tally[r.id] = { count: 0, mine: false }));
      (sup ?? []).forEach((s) => {
        const t = tally[s.prayer_id];
        if (!t) return;
        t.count += 1;
        if (userId && s.user_id === userId) t.mine = true;
      });
      setSupports(tally);
    } else {
      setSupports({});
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`prayers-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_requests", filter: `group_id=eq.${groupId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prayer_supports" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, userId]);

  const submit = async () => {
    if (!draft.trim() || !userId) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("prayer_requests").insert({
      group_id: groupId,
      user_id: userId,
      author_name: user?.email?.split("@")[0] ?? "Member",
      body: draft.trim(),
    });
    setSending(false);
    if (error) toast.error(error.message);
    else {
      setDraft("");
      toast.success("Prayer shared with the group");
    }
  };

  const toggleAmen = async (r: PrayerRequest) => {
    if (!userId) return;
    const cur = supports[r.id] ?? { count: 0, mine: false };
    // optimistic
    setSupports((s) => ({
      ...s,
      [r.id]: { count: cur.count + (cur.mine ? -1 : 1), mine: !cur.mine },
    }));
    if (cur.mine) {
      await supabase.from("prayer_supports").delete().eq("prayer_id", r.id).eq("user_id", userId);
    } else {
      await supabase.from("prayer_supports").insert({ prayer_id: r.id, user_id: userId });
    }
  };

  const remove = async (r: PrayerRequest) => {
    if (!confirm("Delete this prayer request?")) return;
    const { error } = await supabase.from("prayer_requests").delete().eq("id", r.id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex h-full flex-col">
      {isMember ? (
        <div className="border-b border-border p-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share a prayer request…"
            className="font-scripture min-h-[70px] resize-none"
          />
          <div className="mt-2 flex justify-end">
            <Button onClick={submit} size="sm" disabled={sending || !draft.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" /> Share</>}
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-b border-border p-4 text-sm text-muted-foreground">
          Join this group to share prayer requests.
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "55vh" }}>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : requests.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No prayer requests yet. Be the first to share one.
          </p>
        ) : (
          requests.map((r) => {
            const s = supports[r.id] ?? { count: 0, mine: false };
            const canDelete = isAdmin || r.user_id === userId;
            return (
              <article
                key={r.id}
                className="rounded-xl border border-border bg-card/60 p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {r.author_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{r.author_name}</span>
                      <span>·</span>
                      <span>{new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap font-scripture text-sm leading-relaxed text-foreground">
                      {r.body}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => toggleAmen(r)}
                        disabled={!isMember}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                          s.mine
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-background hover:bg-muted",
                        )}
                      >
                        <HandHeart className={cn("h-3.5 w-3.5", s.mine && "fill-primary/30")} />
                        {s.mine ? "Praying" : "I'll pray"}
                        <span className="ml-1 rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">
                          {s.count}
                        </span>
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => remove(r)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
