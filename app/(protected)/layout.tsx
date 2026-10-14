"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth/auth-provider";
import { HOME_PATH, isPathAllowed } from "@/lib/auth/permissions";
import { ProjectProvider, useProject } from "@/lib/project/project-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

function Gate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // A section the role may not open (a cashier following an old link to
  // /suppliers, say) would only render a wall of 403 errors — send them
  // home instead. The backend still enforces this regardless.
  const allowed = isPathAllowed(user?.role, pathname);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (isAuthenticated && !allowed) router.replace(HOME_PATH);
  }, [isAuthenticated, allowed, user?.role, router]);

  if (!isAuthenticated || !allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Загрузка…
      </div>
    );
  }

  return <>{children}</>;
}

function ProjectGate({ children }: { children: React.ReactNode }) {
  const { projectId, isLoading, projects } = useProject();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Загрузка проектов…
      </div>
    );
  }

  if (!projectId || projects.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Нет доступных проектов для вашей учётной записи.
      </div>
    );
  }

  return <>{children}</>;
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Gate>
        <ProjectProvider>
          <ProjectGate>
            <div className="flex h-dvh overflow-hidden">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <Topbar />
                <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6">
                  {children}
                </main>
              </div>
            </div>
            <BottomNav />
          </ProjectGate>
        </ProjectProvider>
      </Gate>
    </AuthProvider>
  );
}
