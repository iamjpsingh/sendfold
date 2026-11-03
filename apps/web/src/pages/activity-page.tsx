import { useQuery } from "@tanstack/react-query";
import { Activity as ActivityIcon } from "lucide-react";
import type { Activity } from "@sendfold/shared/types";
import { api } from "@/lib/api";
import { PageTitle, Loading, ErrorBox } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ProjectHistory } from "@/features/audit/project-history";
export function ActivityPage() {
  const activity = useQuery({
    queryKey: ["activity"],
    queryFn: () => api<Activity[]>("/activity"),
    refetchInterval: 30000,
  });
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-5 md:p-8">
      <PageTitle
        title="Activity"
        description="A shared record of progress across your projects."
      />
      <ProjectHistory />
      <h2 className="font-semibold">Recent team progress</h2>
      {activity.isPending ? (
        <Loading />
      ) : activity.error ? (
        <ErrorBox error={activity.error} />
      ) : (
        <Card className="shadow-none">
          <CardContent>
            {!activity.data.length ? (
              <div className="py-14 text-center">
                <ActivityIcon className="mx-auto mb-3 size-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Activity will appear as your team works.
                </p>
              </div>
            ) : (
              activity.data.map((a) => (
                <div
                  key={a.id}
                  className="flex gap-4 border-b py-4 last:border-0"
                >
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">
                      {a.author.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{a.author}</span> {a.action}
                    </p>
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {a.detail}
                    </p>
                  </div>
                  <time className="text-right text-xs text-muted-foreground">
                    {new Date(a.createdAt).toLocaleString()}
                  </time>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
