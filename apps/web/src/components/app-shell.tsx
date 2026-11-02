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
  ArrowUpRight,
  LockKeyhole,
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
export function AppShell({ children }: { children: React.ReactNode }) {
  const { data } = useMe(),
    query = useQueryClient(),
    path = useRouterState({ select: (s) => s.location.pathname });
  const user = data!.user;
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
            {data?.installation?.name.slice(0, 2).toUpperCase() ?? "SF"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {data?.installation?.name ?? "Sendfold"}
            </p>
            <p className="text-xs text-muted-foreground">
              {user.role === "super_admin" ? "Super admin" : "Project member"}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-7 px-5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Sendfold
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
                "bg-primary/20 font-medium text-foreground",
            )}
          >
            <Link to={to}>
              <Icon className="size-4" />
              {label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="mt-auto p-4">
        <div className="rounded-lg border border-dashed p-3">
          <LockKeyhole className="mb-2 size-4 text-muted-foreground" />
          <p className="text-xs font-medium">A private place for progress.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Choose exactly who can view, comment, and edit.
          </p>
        </div>
      </div>
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
      <aside className="fixed inset-y-0 hidden w-60 flex-col border-r bg-accent/25 md:flex">
        {nav}
      </aside>
      <div className="min-w-0 flex-1 md:ml-60">
        <header className="no-print flex h-16 items-center justify-between border-b px-5 md:px-8">
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
            <span className="text-sm text-muted-foreground">Sendfold</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-medium">
              {path.startsWith("/projects")
                ? "Project"
                : (links.find((l) => l.to === path)?.label ?? "Projects")}
            </span>
          </div>
          <Badge variant="outline" className="gap-1.5 font-normal">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Private installation
          </Badge>
        </header>
        {children}
        <footer className="no-print flex justify-between gap-4 px-8 py-6 text-xs text-muted-foreground">
          <span>Sendfold · Share work. Reach agreement.</span>
          <span>
            Open source <ArrowUpRight className="inline size-3" />
          </span>
        </footer>
      </div>
    </div>
  );
}
