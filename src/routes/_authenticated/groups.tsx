import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({
    meta: [
      { title: "Study Groups — Lectio" },
      { name: "description", content: "Join public Bible study groups and read together." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
    ],
  }),
  component: GroupsPage,
});

interface Group {
  id: string;
  name: string;
  description: string;
  book: string | null;
  created_at: string;
}

function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data: gs } = await supabase
      .from("study_groups")
      .select("*")
      .order("created_at", { ascending: true });
    const { data: ms } = await supabase
      .from("group_memberships")
      .select("group_id, user_id");

    setGroups((gs ?? []) as Group[]);
    const mine = new Set<string>();
    const tally: Record<string, number> = {};
    (ms ?? []).forEach((m) => {
      tally[m.group_id] = (tally[m.group_id] ?? 0) + 1;
      if (user && m.user_id === user.id) mine.add(m.group_id);
    });
    setMemberIds(mine);
    setCounts(tally);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleGroupAction = async (groupId: string) => {
    // Check if already a member
    if (memberIds.has(groupId)) {
      // Navigate to group details page
      navigate({ to: "/groups/$groupId", params: { groupId } });
      return;
    }

    // Otherwise, join the group
    setJoining(groupId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setJoining(null);
      toast.error("You must be signed in to join a group");
      return;
    }

    // Check one more time if already a member (race condition check)
    const { data: existingMembership } = await supabase
      .from("group_memberships")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      setJoining(null);
      // Update local state and navigate
      setMemberIds((prev) => new Set([...prev, groupId]));
      navigate({ to: "/groups/$groupId", params: { groupId } });
      return;
    }

    const { error } = await supabase.from("group_memberships").insert({
      group_id: groupId,
      user_id: user.id,
      display_name: user.email?.split("@")[0] ?? "Member",
    });

    setJoining(null);
    if (error) {
      if (error.message.includes("unique constraint") || error.message.includes("duplicate")) {
        // User is already a member, navigate to group
        setMemberIds((prev) => new Set([...prev, groupId]));
        navigate({ to: "/groups/$groupId", params: { groupId } });
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Joined group");
      setMemberIds((prev) => new Set([...prev, groupId]));
      // Navigate to the group after joining
      navigate({ to: "/groups/$groupId", params: { groupId } });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
            <SidebarTrigger />
            <div className="flex flex-col leading-tight">
              <span className="font-scripture text-sm font-medium text-foreground">
                Study Groups
              </span>
              <span className="text-xs text-muted-foreground">
                Read scripture in community
              </span>
            </div>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12">
            <div className="mx-auto w-full max-w-4xl">
              {loading ? (
                <div className="flex justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : groups.length === 0 ? (
                <p className="text-center text-muted-foreground">No groups yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {groups.map((g) => {
                    const joined = memberIds.has(g.id);
                    const isProcessing = joining === g.id;
                    return (
                      <article
                        key={g.id}
                        className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" /> {counts[g.id] ?? 0}
                          </span>
                        </div>
                        <h2 className="font-scripture text-xl font-semibold text-foreground">
                          {g.name}
                        </h2>
                        {g.book && (
                          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-primary/80">
                            {g.book}
                          </p>
                        )}
                        <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-muted-foreground">
                          {g.description}
                        </p>
                        <div className="mt-5 flex items-center gap-2">
                          {joined ? (
                            <>
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => handleGroupAction(g.id)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    Enter Group <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                  </>
                                )}
                              </Button>
                              <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">
                                <Check className="h-3 w-3" /> Joined
                              </span>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleGroupAction(g.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Join Group"
                              )}
                            </Button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
