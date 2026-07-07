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
  name: "list_reading_plan",
  title: "List group reading plan",
  description:
    "Return the ordered reading plan (day, book, chapter, scheduled date) for a study group the signed-in user is a member of. Use this to know what a group is studying on any given day.",
  inputSchema: {
    group_id: z.string().uuid().describe("The study group id."),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ group_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = userClient(ctx);

    const membership = await supabase
      .from("group_memberships")
      .select("id")
      .eq("group_id", group_id)
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (membership.error) {
      return { content: [{ type: "text", text: membership.error.message }], isError: true };
    }
    if (!membership.data) {
      return {
        content: [{ type: "text", text: "You are not a member of this group." }],
        isError: true,
      };
    }

    const [groupRes, planRes] = await Promise.all([
      supabase.from("study_groups").select("id, name, book, description").eq("id", group_id).maybeSingle(),
      supabase
        .from("reading_plan_items")
        .select("day_number, title, book, chapter, scheduled_date")
        .eq("group_id", group_id)
        .order("day_number", { ascending: true }),
    ]);
    if (groupRes.error) return { content: [{ type: "text", text: groupRes.error.message }], isError: true };
    if (planRes.error) return { content: [{ type: "text", text: planRes.error.message }], isError: true };

    const result = { group: groupRes.data, reading_plan: planRes.data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
