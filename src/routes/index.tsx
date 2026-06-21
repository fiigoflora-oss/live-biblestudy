import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BibleReader } from "@/components/bible-reader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lectio — Bible Study Dashboard" },
      { name: "description", content: "A peaceful, modern Bible study dashboard with reader, notes, and study groups." },
      { property: "og:title", content: "Lectio — Bible Study Dashboard" },
      { property: "og:description", content: "A peaceful, modern Bible study dashboard with reader, notes, and study groups." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
            <SidebarTrigger />
            <div className="flex flex-col leading-tight">
              <span className="font-scripture text-sm font-medium text-foreground">
                Bible Reader
              </span>
              <span className="text-xs text-muted-foreground">
                Read, reflect, and study Scripture
              </span>
            </div>
          </header>
          <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12">
            <BibleReader />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
