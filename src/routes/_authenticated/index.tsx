import { createFileRoute, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { BookOpen, NotebookPen, Users, UserCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Lectio — Bible Study Dashboard" },
      { name: "description", content: "Read, highlight, and reflect on Scripture." },
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

const tiles = [
  { to: "/reader", title: "Bible Reader", desc: "Open Scripture and study.", icon: BookOpen },
  { to: "/notes", title: "My Notes", desc: "Review highlights and reflections.", icon: NotebookPen },
  { to: "/groups", title: "Study Groups", desc: "Join a community plan.", icon: Users },
  { to: "/profile", title: "Profile", desc: "Manage your account.", icon: UserCircle },
] as const;

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
                Dashboard
              </span>
              <span className="text-xs text-muted-foreground">
                Welcome back to Lectio
              </span>
            </div>
          </header>
          <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12">
            <div className="mx-auto w-full max-w-4xl">
              <h1 className="font-scripture text-3xl font-semibold text-foreground sm:text-4xl">
                Peace be with you.
              </h1>
              <p className="mt-2 font-sans text-muted-foreground">
                Pick up where you left off, or explore a new corner of Scripture.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {tiles.map((t) => (
                  <Link
                    key={t.to}
                    to={t.to}
                    className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <t.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-scripture text-lg font-semibold text-foreground group-hover:text-primary">
                        {t.title}
                      </h2>
                      <p className="font-sans text-sm text-muted-foreground">
                        {t.desc}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
