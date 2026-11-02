import { EditorProvider } from "@/features/files/editor-state";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useRouterState,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { Loading, ErrorBox } from "@/components/common";
import { useMe } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { AuthPage } from "@/pages/auth-page";
import { ProjectsPage } from "@/pages/projects-page";
import { ProjectPage } from "@/pages/project-page";
import { SharedPage } from "@/pages/shared-page";
import { PeoplePage } from "@/pages/people-page";
import { AdminPage } from "@/pages/admin-page";
import { ActivityPage } from "@/pages/activity-page";
import { FileFullPage } from "@/pages/file-full-page";
import { SettingsPage } from "@/pages/settings-page";
import "./styles.css";

function Root() {
  const shared = useRouterState({
    select: (s) =>
      s.location.pathname.startsWith("/s/") ||
      s.location.pathname.startsWith("/preview/"),
  });
  return shared ? <Outlet /> : <Authenticated />;
}
function Authenticated() {
  const me = useMe();
  if (me.isPending) return <Loading />;
  if (me.error)
    return me.error instanceof ApiError && me.error.status === 401 ? (
      <AuthPage />
    ) : (
      <div className="p-8">
        <ErrorBox error={me.error} />
      </div>
    );
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
const root = createRootRoute({
  component: Root,
  notFoundComponent: () => (
    <div className="p-8">This page could not be found.</div>
  ),
});
const routes = [
  createRoute({
    getParentRoute: () => root,
    path: "/preview/$projectId/$fileId",
    component: FileFullPage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/",
    component: ProjectsPage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/projects/$projectId",
    component: () => {
      const { projectId } = useRouterState({
        select: (s) => s.matches.at(-1)!.params,
      }) as { projectId: string };
      return <ProjectPage projectId={projectId} />;
    },
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/s/$token",
    component: SharedPage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/people",
    component: PeoplePage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/admin",
    component: AdminPage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/activity",
    component: ActivityPage,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/settings",
    component: SettingsPage,
  }),
];
const router = createRouter({ routeTree: root.addChildren(routes) });
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <EditorProvider>
            <RouterProvider router={router} />
          </EditorProvider>
          <Toaster richColors />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
