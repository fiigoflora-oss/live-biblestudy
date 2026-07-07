import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getChapter from "./tools/get-chapter";
import listBooks from "./tools/list-books";
import listTranslations from "./tools/list-translations";
import listGroupDiscussions from "./tools/list-group-discussions";
import listReadingPlan from "./tools/list-reading-plan";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "lectio-mcp",
  title: "Lectio Bible Study",
  version: "0.2.0",
  instructions:
    "Tools for the Lectio Bible study app. Public tools: list_translations, list_books, get_chapter. Authenticated tools (per signed-in user): list_group_discussions to see the user's groups with recent community messages and discussion sessions, and list_reading_plan to see what a group is studying day by day.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTranslations, listBooks, getChapter, listGroupDiscussions, listReadingPlan],
});
