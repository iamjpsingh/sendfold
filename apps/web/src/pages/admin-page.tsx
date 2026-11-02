import { useQuery } from "@tanstack/react-query";
import { api, formatBytes } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { PageTitle, ErrorBox } from "@/components/common";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
export function AdminPage() {
  const me = useMe();
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () =>
      api<{ people: number; projects: number; files: number; bytes: number }>(
        "/admin/stats",
      ),
  });
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-5 md:p-8">
      <PageTitle
        title="Administration"
        description={`${me.data?.installation?.name ?? "Sendfold"} · One installation, all your projects.`}
      />
      {stats.error ? (
        <ErrorBox error={stats.error} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Projects", value: stats.data?.projects },
              { label: "People", value: stats.data?.people },
              {
                label: "Current file storage",
                value: formatBytes(stats.data?.bytes ?? 0),
              },
            ].map((s) => (
              <Card key={s.label} className="bg-primary/5 shadow-none">
                <CardHeader>
                  <CardDescription>{s.label}</CardDescription>
                  <CardTitle className="text-3xl">{s.value ?? "…"}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Simple access, project by project</CardTitle>
              <CardDescription>
                The same person can have a different role on each project.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                <strong>Super admin</strong> manages this installation, creates
                accounts and projects, and has access to every project.
              </p>
              <p>
                <strong>Project admin</strong> manages assigned projects,
                members, share links, questions, and locks.
              </p>
              <p>
                <strong>Editor</strong> uploads, edits, answers questions, and
                leaves feedback on assigned projects.
              </p>
              <p>
                <strong>Viewer</strong> views and downloads files in assigned
                projects.
              </p>
              <p className="text-muted-foreground">
                Clients can also use a password-protected share link without
                creating an account. Share permissions are set separately.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
