import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function userClient(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_group_discussions",
  title: "List group discussions",
  description:
    "List study groups the signed-in user belongs to along with their recent community messages (group posts) and any active discussion sessions. Useful for summarizing what a group is studying and what members have said.",
  inputSchema: {
    group_id: z
      .string()
      .uuid()
      .optional()
      .describe("Optional group id to scope the result to a single group."),
    message_limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe("Max recent posts to return per group. Defaults to 50."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ group_id, message_limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const limit = message_limit ?? 50;
    const supabase = userClient(ctx);

    const memberships = await supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", ctx.getUserId());
    if (memberships.error) {
      return { content: [{ type: "text", text: memberships.error.message }], isError: true };
    }
    let groupIds = (memberships.data ?? []).map((m) => m.group_id as string);
    if (group_id) groupIds = groupIds.filter((id) => id === group_id);
    if (groupIds.length === 0) {
      return {
        content: [{ type: "text", text: "You are not a member of any matching group." }],
        structuredContent: { groups: [] },
      };
    }

    const [groupsRes, postsRes, sessionsRes] = await Promise.all([
      supabase.from("study_groups").select("id, name, description, book, created_at").in("id", groupIds),
      supabase
        .from("group_posts")
        .select("id, group_id, author_name, body, reading_day, created_at")
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(limit * groupIds.length),
      supabase
        .from("discussion_sessions")
        .select("id, group_id, reading_day, title, summary_status, created_at, updated_at")
        .in("group_id", groupIds)
        .order("updated_at", { ascending: false }),
    ]);
    for (const r of [groupsRes, postsRes, sessionsRes]) {
      if (r.error) return { content: [{ type: "text", text: r.error.message }], isError: true };
    }

    const groups = (groupsRes.data ?? []).map((g) => ({
      ...g,
      recent_posts: (postsRes.data ?? [])
        .filter((p) => p.group_id === g.id)
        .slice(0, limit),
      discussion_sessions: (sessionsRes.data ?? []).filter((s) => s.group_id === g.id),
    }));

    return {
      content: [{ type: "text", text: JSON.stringify(groups, null, 2) }],
      structuredContent: { groups },
    };
  },
});
