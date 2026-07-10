import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, BookOpen, Loader2, ArrowRight, Check, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups/")({
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
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBook, setNewBook] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Group name is required");
      return;
    }
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      toast.error("You must be signed in");
      return;
    }

    const { data: inserted, error } = await supabase
      .from("study_groups")
      .insert({
        name: newName.trim(),
        description: newDescription.trim(),
        book: newBook.trim() || null,
        is_public: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !inserted) {
      setCreating(false);
      toast.error(error?.message ?? "Failed to create group");
      return;
    }

    // Creator is automatically added as an approved admin by a DB trigger.

    setGroups((prev) => [...prev, inserted as Group]);
    setMemberIds((prev) => new Set([...prev, inserted.id]));
    setCounts((prev) => ({ ...prev, [inserted.id]: 1 }));
    setNewName("");
    setNewBook("");
    setNewDescription("");
    setShowCreate(false);
    setCreating(false);
    toast.success("Group created");
    load();
  };

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();

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

  const enterGroup = (groupId: string) => {
    navigate({ to: "/groups/$groupId", params: { groupId } });
  };

  const handleGroupAction = async (groupId: string) => {
    if (memberIds.has(groupId)) {
      enterGroup(groupId);
      return;
    }

    setJoining(groupId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setJoining(null);
      toast.error("You must be signed in to join a group");
      return;
    }

    const { data: existingMembership } = await supabase
      .from("group_memberships")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMembership) {
      setJoining(null);
      setMemberIds((prev) => new Set([...prev, groupId]));
      enterGroup(groupId);
      return;
    }

    const { error } = await supabase.from("group_memberships").insert({
      group_id: groupId,
      user_id: user.id,
      display_name: user.email?.split("@")[0] ?? "Member",
      role: "member",
      status: "pending",
    });

    setJoining(null);
    if (error) {
      if (error.message.includes("unique constraint") || error.message.includes("duplicate")) {
        setMemberIds((prev) => new Set([...prev, groupId]));
        enterGroup(groupId);
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Join request sent — an admin will approve you soon");
      load();
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
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Browse public groups or start your own.
                </p>
                <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
                  <Plus className="mr-1 h-4 w-4" />
                  {showCreate ? "Cancel" : "New Group"}
                </Button>
              </div>

              {showCreate && (
                <form
                  onSubmit={handleCreateGroup}
                  className="mb-8 space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <Input
                    placeholder="Group name (e.g. Romans Deep Dive)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={creating}
                    required
                  />
                  <Input
                    placeholder="Book focus (optional, e.g. Romans)"
                    value={newBook}
                    onChange={(e) => setNewBook(e.target.value)}
                    disabled={creating}
                  />
                  <Textarea
                    placeholder="What is this group about?"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    disabled={creating}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={creating}>
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Group"}
                    </Button>
                  </div>
                </form>
              )}

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
                              <Button asChild size="sm" className="flex-1">
                                <Link
                                  to="/groups/$groupId"
                                  params={{ groupId: g.id }}
                                  preload="intent"
                                >
                                  Enter Group <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                </Link>
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