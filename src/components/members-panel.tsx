import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Loader2, ShieldCheck, UserMinus, X, Crown, PencilRuler, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Role = "admin" | "plan_maker" | "member";

interface Membership {
  id: string;
  user_id: string;
  display_name: string | null;
  role: Role;
  status: string;
  joined_at: string;
}

interface Props {
  groupId: string;
  isAdmin: boolean;
}

const ROLE_META: Record<Role, { label: string; icon: typeof Crown; color: string }> = {
  admin: { label: "Admin", icon: Crown, color: "text-amber-600" },
  plan_maker: { label: "Plan Maker", icon: PencilRuler, color: "text-primary" },
  member: { label: "Member", icon: User, color: "text-muted-foreground" },
};

export function MembersPanel({ groupId, isAdmin }: Props) {
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("group_memberships")
      .select("id, user_id, display_name, role, status, joined_at")
      .eq("group_id", groupId)
      .order("joined_at", { ascending: true });
    if (error) toast.error(error.message);
    setMembers((data ?? []) as Membership[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const approve = async (m: Membership) => {
    setPendingAction(m.id);
    const { error } = await supabase.from("group_memberships").update({ status: "approved" }).eq("id", m.id);
    setPendingAction(null);
    if (error) toast.error(error.message);
    else { toast.success(`${m.display_name ?? "Member"} approved`); load(); }
  };

  const remove = async (m: Membership) => {
    if (!confirm(`Remove ${m.display_name ?? "this member"} from the group?`)) return;
    setPendingAction(m.id);
    const { error } = await supabase.from("group_memberships").delete().eq("id", m.id);
    setPendingAction(null);
    if (error) toast.error(error.message);
    else load();
  };

  const setRole = async (m: Membership, role: Role) => {
    setPendingAction(m.id);
    const { error } = await supabase.from("group_memberships").update({ role }).eq("id", m.id);
    setPendingAction(null);
    if (error) toast.error(error.message);
    else load();
  };

  const pending = members.filter((m) => m.status === "pending");
  const approved = members.filter((m) => m.status === "approved");

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-4">
      {isAdmin && (
        <section>
          <h3 className="mb-2 font-scripture text-sm font-semibold text-foreground">
            Pending requests <span className="ml-1 text-muted-foreground">({pending.length})</span>
          </h3>
          {pending.length === 0 ? (
            <p className="text-xs text-muted-foreground">No pending requests.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                      {m.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.display_name ?? "Member"}</p>
                      <p className="text-xs text-muted-foreground">Wants to join</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => approve(m)} disabled={pendingAction === m.id} className="gap-1">
                      {pendingAction === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(m)} disabled={pendingAction === m.id}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-2 font-scripture text-sm font-semibold text-foreground">
          Members <span className="ml-1 text-muted-foreground">({approved.length})</span>
        </h3>
        <ul className="space-y-2">
          {approved.map((m) => {
            const meta = ROLE_META[m.role];
            const Icon = meta.icon;
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                    {m.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.display_name ?? "Member"}</p>
                    <p className={cn("inline-flex items-center gap-1 text-xs", meta.color)}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </p>
                  </div>
                </div>
                {isAdmin && m.role !== "admin" && (
                  <div className="flex items-center gap-1">
                    {m.role === "member" ? (
                      <Button size="sm" variant="outline" onClick={() => setRole(m, "plan_maker")} disabled={pendingAction === m.id} className="gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Make Plan Maker
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setRole(m, "member")} disabled={pendingAction === m.id}>
                        Revoke
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => remove(m)} disabled={pendingAction === m.id}>
                      <UserMinus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
