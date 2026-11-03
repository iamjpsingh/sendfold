import { useEditorState } from "@/features/files/editor-state";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  FolderOpen,
  Users,
  Activity,
  Settings,
  ShieldCheck,
  LogOut,
  PanelLeft,
} from "lucide-react";
import { useMe } from "@/lib/queries";
import { post } from "@/lib/api";
import { Brand } from "./common";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { BrandFooter, useBranding } from "@/features/branding/brand";
import { cn } from "@/lib/utils";
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data } = useMe(),
    query = useQueryClient(),
    path = useRouterState({ select: (s) => s.location.pathname });
  const user = data!.user;
  const { branding } = useBranding();
  const { editing } = useEditorState();
  const links = [
    { to: "/", label: "Projects", icon: FolderOpen },
    { to: "/activity", label: "Activity", icon: Activity },
    ...(user.role === "super_admin"
      ? [{ to: "/people", label: "People", icon: Users }]
      : []),
    ...(user.role === "super_admin"
      ? [{ to: "/admin", label: "Administration", icon: ShieldCheck }]
      : []),
    { to: "/settings", label: "Settings", icon: Settings },
  ];
  const nav = (
    <>
      <div className="px-5 py-6">
        <Brand />
      </div>
      <div className="mx-3 rounded-lg border bg-background px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-muted text-xs font-semibold">
            {branding.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{branding.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.role === "super_admin" ? "Super admin" : "Project member"}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-7 px-5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Workspace
      </div>
      <nav className="mt-2 space-y-1 px-3">
        {links.map(({ to, label, icon: Icon }) => (
          <Button
            asChild
            key={to}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-muted-foreground",
              (path === to || (to === "/" && path.startsWith("/projects"))) &&
                "bg-primary/10 font-medium text-link",
            )}
          >
            <Link to={to}>
              <Icon className="size-4" />
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="mt-auto" />
      <Separator />
      <div className="flex items-center gap-3 p-4">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">
            {user.name
              .split(" ")
              .map((x) => x[0])
              .slice(0, 2)
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          disabled={editing}
          onClick={async () => {
            await post("/auth/sign-out", {});
            query.clear();
            location.assign("/");
          }}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </>
  );
  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded-md bg-primary p-3 text-primary-foreground focus:not-sr-only"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 hidden w-60 flex-col border-r bg-accent/25 md:flex">
        {nav}
      </aside>
      <div className="min-w-0 flex-1 md:ml-60">
        <header className="no-print sticky top-0 z-30 flex h-16 bg-background items-center justify-between border-b px-5 md:px-8">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation"
                >
                  <PanelLeft />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-64 flex-col p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                {nav}
              </SheetContent>
            </Sheet>
            <span className="max-w-40 truncate text-sm text-muted-foreground">
              {branding.name}
            </span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-medium">
              {path.startsWith("/projects")
                ? "Project"
                : (links.find((l) => l.to === path)?.label ?? "Projects")}
            </span>
          </div>
        </header>
        <div
          id="main-content"
          tabIndex={-1}
          className="scroll-mt-20 outline-none"
        >
          {children}
        </div>
        <BrandFooter />
      </div>
    </div>
  );
}
