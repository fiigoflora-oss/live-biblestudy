import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Send,
  Users,
  Trash2,
  Archive,
  Sparkles,
  HandHeart,
  UsersRound,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceRoom } from "@/components/voice-room";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PastDiscussions } from "@/components/past-discussions";
import { useServerFn } from "@tanstack/react-start";
import { generateDiscussionSummary } from "@/lib/discussion-summary.functions";
import { PrayerRequests } from "@/components/prayer-requests";
import { MembersPanel } from "@/components/members-panel";
import { PlanEditor } from "@/components/plan-editor";
import { AttachmentPicker, AttachmentList, type AttachmentMeta } from "@/components/attachment-picker";

export const Route = createFileRoute("/_authenticated/groups/$groupId")({
  head: () => ({
    meta: [{ title: "Study Group — Lectio" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
    ],
  }),
  component: GroupDetailPage,
});

interface Group {
  id: string;
  name: string;
  description: string;
  book: string | null;
  created_by: string | null;
}
interface PlanItem {
  id: string;
  day_number: number;
  title: string;
  book: string;
  chapter: number;
}
interface Post {
  id: string;
  user_id: string;
  author_name: string;
  body: string;
  reading_day: number | null;
  created_at: string;
  attachments?: AttachmentMeta[] | null;
}

function GroupDetailPage() {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [role, setRole] = useState<"admin" | "plan_maker" | "member" | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const [endingSession, setEndingSession] = useState(false);
  const [pastRefreshKey, setPastRefreshKey] = useState(0);
  const summarize = useServerFn(generateDiscussionSummary);

  const isAdmin = role === "admin";
  const canManagePlan = role === "admin" || role === "plan_maker";

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const [g, p, m, ps] = await Promise.all([
      supabase.from("study_groups").select("*").eq("id", groupId).maybeSingle(),
      supabase
        .from("reading_plan_items")
        .select("*")
        .eq("group_id", groupId)
        .order("day_number"),
      supabase.from("group_memberships").select("user_id, role, status, display_name").eq("group_id", groupId),
      supabase
        .from("group_posts")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true }),
    ]);

    if (!g.data) {
      navigate({ to: "/groups" });
      return;
    }
    setGroup(g.data as Group);
    setPlan((p.data ?? []) as PlanItem[]);
    const rows = (m.data ?? []) as Array<{ user_id: string; role: "admin" | "plan_maker" | "member"; status: string; display_name: string | null }>;
    setMemberCount(rows.filter((r) => r.status === "approved").length);
    const admin = rows.find((r) => r.role === "admin" && r.status === "approved");
    setAdminName(admin?.display_name ?? null);
    const mine = user ? rows.find((r) => r.user_id === user.id) : undefined;
    setIsMember(!!mine && mine.status === "approved");
    setIsPending(!!mine && mine.status === "pending");
    setRole(mine && mine.status === "approved" ? mine.role : null);
    setPosts((ps.data ?? []) as Post[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_posts", filter: `group_id=eq.${groupId}` },
        (payload) => setPosts((prev) => [...prev, payload.new as Post]),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "group_posts", filter: `group_id=eq.${groupId}` },
        (payload) => setPosts((prev) => prev.filter((p) => p.id !== (payload.old as Post).id)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [posts.length]);

  const join = async () => {
    if (!userId) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("group_memberships").insert({
      group_id: groupId,
      user_id: userId,
      display_name: user?.email?.split("@")[0] ?? "Member",
      role: "member",
      status: "pending",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Join request sent — awaiting admin approval");
      load();
    }
  };

  const send = async () => {
    if ((!draft.trim() && attachments.length === 0) || !userId) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("group_posts").insert({
      group_id: groupId,
      user_id: userId,
      author_name: user?.email?.split("@")[0] ?? "Member",
      body: draft.trim(),
      reading_day: activeDay,
      attachments: attachments as unknown as never,
    });
    setSending(false);
    if (error) toast.error(error.message);
    else { setDraft(""); setAttachments([]); }
  };


  const deletePost = async (id: string) => {
    await supabase.from("group_posts").delete().eq("id", id);
  };

  const endAndSaveDiscussion = async () => {
    if (!userId || dayPosts.length === 0) return;
    setEndingSession(true);
    try {
      const planItem = plan.find((pi) => pi.day_number === activeDay);
      const title = planItem ? `${planItem.book} ${planItem.chapter} — Day ${activeDay}` : `Day ${activeDay} Discussion`;
      const snapshot = dayPosts.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        author_name: p.author_name,
        body: p.body,
        created_at: p.created_at,
      }));

      const { data: inserted, error } = await supabase
        .from("discussion_sessions")
        .insert({
          group_id: groupId,
          reading_day: activeDay,
          title,
          messages: snapshot,
          ended_by: userId,
          summary_status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;

      toast.success("Discussion saved. Generating summary…");
      setPastRefreshKey((k) => k + 1);

      try {
        await summarize({ data: { sessionId: inserted.id } });
        toast.success("AI summary ready");
        setPastRefreshKey((k) => k + 1);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Summary failed — you can retry from Past Discussions");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save discussion");
    } finally {
      setEndingSession(false);
    }
  };

  const dayPosts = posts.filter((p) => p.reading_day === activeDay);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
            <SidebarTrigger />
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/groups">
                <ArrowLeft className="h-4 w-4" /> Groups
              </Link>
            </Button>
          </header>

          {loading || !group ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <main className="flex-1 px-4 py-8 sm:px-8 sm:py-10">
              <div className="mx-auto w-full max-w-6xl">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-primary/80">
                      {group.book ?? "Study Group"}
                    </p>
                    <h1 className="font-scripture mt-1 text-3xl font-semibold text-foreground sm:text-4xl">
                      {group.name}
                    </h1>
                    <p className="mt-2 max-w-2xl font-sans text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {memberCount} member{memberCount === 1 ? "" : "s"}
                    </span>
                    {!isMember && !isPending && <Button onClick={join}>Request to join</Button>}
                    {isPending && (
                      <span className="rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700">
                        Awaiting admin approval
                      </span>
                    )}
                    {role && (
                      <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium capitalize text-primary">
                        {role.replace("_", " ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                  {/* Reading Plan */}
                  <aside className="rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <h2 className="font-scripture text-lg font-semibold text-foreground">
                        Reading Plan
                      </h2>
                    </div>
                    <ol className="space-y-1.5">
                      {plan.map((item) => {
                        const active = item.day_number === activeDay;
                        return (
                          <li key={item.id}>
                            <button
                              onClick={() => setActiveDay(item.day_number)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                                active
                                  ? "border-primary/40 bg-primary/5"
                                  : "border-transparent hover:bg-muted/60",
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                  active
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                {item.day_number}
                              </span>
                              <div className="flex flex-col leading-tight">
                                <span className="font-scripture text-sm font-medium text-foreground">
                                  {item.book} {item.chapter}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Day {item.day_number}
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                    {canManagePlan && (
                      <PlanEditor groupId={groupId} plan={plan} onChanged={load} />
                    )}
                  </aside>

                  {/* Discussion + Past + Voice */}
                  <section className="flex min-h-[500px] flex-col">
                    <Tabs defaultValue="active" className="flex flex-1 flex-col">
                      <TabsList className="mb-3 bg-muted/60">
                        <TabsTrigger value="active" className="font-scripture data-[state=active]:bg-card">
                          Active Discussion
                        </TabsTrigger>

                        <TabsTrigger value="voice" className="font-scripture data-[state=active]:bg-card">
                          Voice Room
                        </TabsTrigger>

                        <TabsTrigger value="prayer" className="font-scripture data-[state=active]:bg-card">
                          <HandHeart className="mr-1.5 h-3.5 w-3.5" /> Prayer
                        </TabsTrigger>

                        <TabsTrigger value="members" className="font-scripture data-[state=active]:bg-card">
                          <UsersRound className="mr-1.5 h-3.5 w-3.5" /> Members
                        </TabsTrigger>

                        <TabsTrigger value="past" className="font-scripture data-[state=active]:bg-card">
                          <Archive className="mr-1.5 h-3.5 w-3.5" /> Past
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="active" className="m-0 flex flex-1 flex-col rounded-xl border border-border bg-card shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                          <div>
                            <h2 className="font-scripture text-lg font-semibold text-foreground">
                              Day {activeDay} Discussion
                            </h2>
                            <p className="text-xs text-muted-foreground">
                              Share what you noticed in today's reading
                            </p>
                          </div>
                          {isMember && dayPosts.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={endAndSaveDiscussion}
                              disabled={endingSession}
                              className="gap-1.5"
                            >
                              {endingSession ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                              )}
                              End & Save Recap
                            </Button>
                          )}
                        </div>

                        <div
                          ref={feedRef}
                          className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
                          style={{ maxHeight: "55vh" }}
                        >
                          {dayPosts.length === 0 ? (
                            <p className="py-12 text-center text-sm text-muted-foreground">
                              No posts yet for this day. Be the first to share.
                            </p>
                          ) : (
                            dayPosts.map((p) => {
                              const mine = p.user_id === userId;
                              return (
                                <div key={p.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                                    {p.author_name[0]?.toUpperCase()}
                                  </div>
                                  <div className={cn("max-w-[80%] flex-col", mine ? "items-end" : "items-start")}>
                                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="font-medium text-foreground">{p.author_name}</span>
                                      <span>{new Date(p.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                    </div>
                                    <div
                                      className={cn(
                                        "rounded-2xl px-4 py-2.5 font-scripture text-sm leading-relaxed",
                                        mine
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-foreground",
                                      )}
                                    >
                                      {p.body}
                                    </div>
                                    <AttachmentList attachments={(p.attachments ?? []) as AttachmentMeta[]} />
                                    {mine && (
                                      <button
                                        onClick={() => deletePost(p.id)}
                                        className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" /> Delete
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="border-t border-border p-4">
                          {isMember ? (
                            <div className="space-y-2">
                              <div className="flex items-end gap-2">
                                <Textarea
                                  value={draft}
                                  onChange={(e) => setDraft(e.target.value)}
                                  placeholder={`Share a thought on Day ${activeDay}…`}
                                  className="font-scripture min-h-[60px] resize-none"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                      e.preventDefault();
                                      send();
                                    }
                                  }}
                                />
                                <Button onClick={send} disabled={sending || (!draft.trim() && attachments.length === 0)} size="icon" className="h-10 w-10 shrink-0">
                                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                              </div>
                              <AttachmentPicker groupId={groupId} value={attachments} onChange={setAttachments} disabled={sending} />
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-4 py-3">
                              <p className="text-sm text-muted-foreground">Join this group to post in the discussion.</p>
                              <Button size="sm" onClick={join}>Join</Button>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="voice"
                        className="m-0 flex flex-1 flex-col rounded-xl border border-border bg-card shadow-sm overflow-y-auto"
                      >
                        <div className="px-5 py-5">
                          {isMember ? (
                            <VoiceRoom groupId={groupId} groupName={group!.name} />
                          ) : (
                            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-4 py-3">
                              <p className="text-sm text-muted-foreground">Join this group to access the Voice Room.</p>
                              <Button size="sm" onClick={join}>Join</Button>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="prayer" className="m-0 flex flex-1 flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                        <PrayerRequests groupId={groupId} isMember={isMember} isAdmin={isAdmin} userId={userId} />
                      </TabsContent>

                      <TabsContent value="members" className="m-0 flex flex-1 flex-col rounded-xl border border-border bg-card shadow-sm overflow-y-auto">
                        <MembersPanel groupId={groupId} isAdmin={isAdmin} />
                      </TabsContent>

                      <TabsContent value="past" className="m-0 flex flex-1 flex-col rounded-xl border border-border bg-card shadow-sm overflow-y-auto">
                        <div className="flex-1 px-5 py-5">
                          <PastDiscussions key={pastRefreshKey} groupId={groupId} />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </section>
                </div>
              </div>
            </main>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
