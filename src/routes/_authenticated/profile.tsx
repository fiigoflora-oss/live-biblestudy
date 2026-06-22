import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Lectio" },
      { name: "description", content: "Your Lectio account." },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setCreatedAt(data.user?.created_at ?? null);
    });
  }, []);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
            <SidebarTrigger />
            <span className="font-scripture text-sm font-medium text-foreground">
              Profile
            </span>
          </header>
          <main className="flex-1 px-4 py-8 sm:px-8 sm:py-12">
            <div className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-card p-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <UserCircle className="h-10 w-10" />
                </div>
                <div>
                  <h1 className="font-scripture text-2xl font-semibold text-foreground">
                    {email ?? "Loading…"}
                  </h1>
                  {createdAt && (
                    <p className="text-sm text-muted-foreground">
                      Member since {new Date(createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
