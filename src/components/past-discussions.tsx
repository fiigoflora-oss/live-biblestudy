import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { generateDiscussionSummary } from "@/lib/discussion-summary.functions";
import {
  Sparkles,
  History,
  BookOpen,
  Lightbulb,
  Heart,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SessionMessage {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

interface Summary {
  overview?: string;
  main_ideas?: string[];
  scripture_refs?: string[];
  takeaways?: string[];
  prayer_requests?: string[];
}

interface Session {
  id: string;
  title: string;
  reading_day: number | null;
  messages: SessionMessage[];
  summary: Summary | null;
  summary_status: string;
  created_at: string;
}

export function PastDiscussions({ groupId }: { groupId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const summarize = useServerFn(generateDiscussionSummary);

  const load = async () => {
    const { data } = await supabase
      .from("discussion_sessions")
      .select("id, title, reading_day, messages, summary, summary_status, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    setSessions((data ?? []) as unknown as Session[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [groupId]);

  const runSummary = async (id: string) => {
    setBusyId(id);
    try {
      await summarize({ data: { sessionId: id } });
      toast.success("AI summary ready");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate summary");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
        <History className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />
        <p className="font-scripture text-sm text-muted-foreground">
          No past discussions yet. When a session is closed, its recap and AI study summary will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((s) => {
        const open = openId === s.id;
        const hasSummary = s.summary_status === "ready" && s.summary;
        return (
          <article
            key={s.id}
            className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
          >
            <button
              onClick={() => setOpenId(open ? null : s.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary/80">
                  {s.reading_day ? <>Day {s.reading_day}</> : <>Session</>}
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <h3 className="font-scripture mt-0.5 truncate text-base font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.messages.length} message{s.messages.length === 1 ? "" : "s"}
                  {hasSummary && (
                    <span className="ml-2 inline-flex items-center gap-1 text-primary">
                      <Sparkles className="h-3 w-3" /> AI summary ready
                    </span>
                  )}
                </p>
              </div>
              {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </button>

            {open && (
              <div className="space-y-5 border-t border-border bg-background/40 px-5 py-5">
                {/* AI Summary */}
                <section className="rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/10 p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <h4 className="font-scripture text-sm font-semibold tracking-wide text-foreground">
                        AI Study Summary
                      </h4>
                    </div>
                    {hasSummary && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => runSummary(s.id)}
                        disabled={busyId === s.id}
                        className="h-7 gap-1 text-xs"
                      >
                        {busyId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        Regenerate
                      </Button>
                    )}
                  </div>

                  {!hasSummary ? (
                    <div className="flex flex-col items-start gap-3">
                      <p className="text-sm text-muted-foreground">
                        {s.summary_status === "error"
                          ? "We couldn't generate a summary last time."
                          : "Generate a thoughtful recap of this discussion."}
                      </p>
                      <Button size="sm" onClick={() => runSummary(s.id)} disabled={busyId === s.id}>
                        {busyId === s.id ? (
                          <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Reflecting…</>
                        ) : (
                          <><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Generate AI Summary</>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <SummaryView summary={s.summary!} />
                  )}
                </section>

                {/* Transcript */}
                <section>
                  <h4 className="font-scripture mb-3 text-sm font-semibold text-foreground">Discussion Transcript</h4>
                  {s.messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages were saved for this session.</p>
                  ) : (
                    <ol className="space-y-2.5">
                      {s.messages.map((m) => (
                        <li key={m.id} className="flex gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                            {m.author_name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{m.author_name}</span>
                              <span>{new Date(m.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                            </div>
                            <p className="font-scripture mt-0.5 text-sm leading-relaxed text-foreground/90">{m.body}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function SummaryView({ summary }: { summary: Summary }) {
  return (
    <div className="space-y-4">
      {summary.overview && (
        <p className="font-scripture text-sm leading-relaxed text-foreground/90 italic">
          “{summary.overview}”
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryBlock icon={<Lightbulb className="h-3.5 w-3.5" />} title="Main Ideas" items={summary.main_ideas} />
        <SummaryBlock icon={<BookOpen className="h-3.5 w-3.5" />} title="Scripture Covered" items={summary.scripture_refs} variant="pill" />
        <SummaryBlock icon={<Sparkles className="h-3.5 w-3.5" />} title="Key Takeaways" items={summary.takeaways} />
        <SummaryBlock icon={<Heart className="h-3.5 w-3.5" />} title="Prayer Requests" items={summary.prayer_requests} />
      </div>
    </div>
  );
}

function SummaryBlock({
  icon,
  title,
  items,
  variant = "list",
}: {
  icon: React.ReactNode;
  title: string;
  items?: string[];
  variant?: "list" | "pill";
}) {
  const list = items ?? [];
  return (
    <div className="rounded-lg border border-border/60 bg-card/80 p-3.5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary/80">
        {icon}
        {title}
      </div>
      {list.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">None noted.</p>
      ) : variant === "pill" ? (
        <div className="flex flex-wrap gap-1.5">
          {list.map((v, i) => (
            <span key={i} className="font-scripture rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
              {v}
            </span>
          ))}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {list.map((v, i) => (
            <li key={i} className={cn("font-scripture text-sm leading-snug text-foreground/90 before:mr-2 before:text-primary/60 before:content-['•']")}>
              {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
