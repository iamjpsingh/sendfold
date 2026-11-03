import { type C, fail, projectAccess } from "../context";
export async function requireProjectAdmin(c: C, projectId: string) {
  const result = await projectAccess(c, projectId);
  if (!result.access.manage || c.env.connector)
    fail(403, "Project administrator access is required.");
  return result;
}
