export type ActorKind =
  "member" | "guest" | "anonymous" | "connector" | "legacy";
export interface AuditActor {
  actorKey: string;
  actorKind: ActorKind;
  actorName: string;
  actorEmail: string | null;
  shareId: string | null;
  shareLabel: string | null;
}
export interface RequestInfo {
  ipAddress: string | null;
  country: string | null;
  userAgent: string | null;
}
export interface AuditEvent extends AuditActor, RequestInfo {
  id: string;
  projectId: string;
  action: string;
  detail: string;
  resourceId: string | null;
  createdAt: number;
}
export interface AuditVisitor extends AuditActor {
  firstSeen: number;
  lastSeen: number;
  eventCount: number;
  ipAddress: string | null;
  country: string | null;
  userAgent: string | null;
}
export interface AuditPage {
  events: AuditEvent[];
  nextCursor: string | null;
  total: number;
  visitorCount: number;
  firstRecordedAt: number | null;
  actions: string[];
}
export interface VisitorsPage {
  visitors: AuditVisitor[];
  total: number;
}
export interface ResponseRecord {
  id: string;
  questionId: string;
  actorKey: string;
  actorKind: ActorKind;
  author: string;
  actorEmail: string | null;
  shareLabel: string | null;
  value: string | string[];
  updatedAt: number;
}
export interface ResponsesPage {
  responses: ResponseRecord[];
  total: number;
  summary: {
    respondents: number;
    responses: number;
    answeredQuestions: number;
  };
}
