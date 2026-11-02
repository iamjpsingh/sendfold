import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SessionUser } from "@sendfold/shared/types";
import { api, patch } from "@/lib/api";
import { useMe } from "@/lib/queries";
import { PageTitle, Loading, ErrorBox } from "@/components/common";
import { AddPerson } from "@/features/people/add-person";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
export function PeoplePage() {
  const me = useMe(),
    people = useQuery({
      queryKey: ["people"],
      queryFn: () => api<SessionUser[]>("/people"),
    });
  async function update(
    id: string,
    change: { role?: string; disabled?: boolean },
  ) {
    try {
      await patch(`/people/${id}`, change);
      await people.refetch();
      toast.success("Access updated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <main className="mx-auto max-w-6xl space-y-8 p-5 md:p-8">
      <PageTitle
        title="People"
        description="Create accounts here. Assign admin, editor, or viewer access inside each project."
        actions={
          me.data?.user.role === "super_admin" ? (
            <AddPerson onChange={() => void people.refetch()} />
          ) : undefined
        }
      />
      {people.isPending ? (
        <Loading />
      ) : people.error ? (
        <ErrorBox error={people.error} />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {p.role === "super_admin"
                        ? "Super admin"
                        : "Project member"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.disabled ? "outline" : "secondary"}>
                      {p.disabled ? "Disabled" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.role !== "super_admin" && p.id !== me.data?.user.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => update(p.id, { disabled: !p.disabled })}
                      >
                        {p.disabled ? "Enable" : "Disable"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
