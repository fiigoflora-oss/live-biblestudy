import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const InputSchema = z.object({ sessionId: z.string().uuid() });

interface SummaryShape {
  main_ideas: string[];
  scripture_refs: string[];
  takeaways: string[];
  prayer_requests: string[];
  overview: string;
}

export const generateDiscussionSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: session, error } = await supabase
      .from("discussion_sessions")
      .select("id, title, reading_day, messages, group_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (error || !session) throw new Error("Session not found");

    const messages = (session.messages as Array<{ author_name: string; body: string }>) ?? [];
    const transcript = messages.map((m) => `${m.author_name}: ${m.body}`).join("\n") || "(no messages)";

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const systemPrompt = `You are a thoughtful Bible study assistant. Summarize a small-group discussion transcript into a JSON object with these exact keys:
- overview: one warm 2-sentence paragraph capturing the spirit of the conversation.
- main_ideas: 3-5 short bullet strings of the key ideas discussed.
- scripture_refs: array of Bible references mentioned or clearly alluded to (e.g. "Mark 1:9-11"). Empty array if none.
- takeaways: 2-4 short personal/spiritual takeaways from the discussion.
- prayer_requests: any prayer requests or pastoral needs mentioned. Empty array if none.
Return ONLY valid JSON. No prose, no markdown fencing.`;

    const userPrompt = `Discussion title: ${session.title}\n${session.reading_day ? `Reading Day: ${session.reading_day}\n` : ""}\nTranscript:\n${transcript}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      await supabase
        .from("discussion_sessions")
        .update({ summary_status: "error" })
        .eq("id", session.id);
      if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
      throw new Error(`AI request failed: ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: SummaryShape;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    const summary: SummaryShape = {
      overview: parsed.overview ?? "",
      main_ideas: parsed.main_ideas ?? [],
      scripture_refs: parsed.scripture_refs ?? [],
      takeaways: parsed.takeaways ?? [],
      prayer_requests: parsed.prayer_requests ?? [],
    };

    const { error: upErr } = await supabase
      .from("discussion_sessions")
      .update({ summary: summary as unknown as Record<string, unknown>, summary_status: "ready" })
      .eq("id", session.id);
    if (upErr) throw upErr;

    return { ok: true as const, summary };
  });
