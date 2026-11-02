export type Role = "super_admin" | "member";
export type ProjectRole = "admin" | "editor" | "viewer";
export interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: ProjectRole;
  disabled: boolean;
}
export type Permission = "view" | "comment" | "edit";
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  disabled: boolean;
}
export interface Installation {
  id: string;
  name: string;
  createdAt: number;
}
export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  client: string;
  description: string;
  status: "active" | "locked" | "archived";
  color: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  fileCount?: number;
  commentCount?: number;
  shareCount?: number;
}
export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  path: string;
  mime: string;
  size: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}
export interface Share {
  id: string;
  projectId: string;
  token: string;
  label: string;
  permission: Permission;
  allowDownload: boolean;
  allowUpload: boolean;
  expiresAt: number | null;
  revokedAt: number | null;
  createdAt: number;
}
export interface Comment {
  id: string;
  projectId: string;
  fileId: string | null;
  version: number | null;
  body: string;
  author: string;
  actorKey: string;
  resolved: boolean;
  createdAt: number;
}
export interface Question {
  id: string;
  projectId: string;
  prompt: string;
  type: "text" | "single" | "multiple" | "approval";
  options: string[];
  position: number;
  createdAt: number;
}
export interface Answer {
  id: string;
  questionId: string;
  actorKey: string;
  author: string;
  value: string | string[];
  updatedAt: number;
}
export interface Activity {
  id: string;
  workspaceId: string;
  projectId: string | null;
  author: string;
  action: string;
  detail: string;
  createdAt: number;
}
export interface Access {
  permission: Permission;
  allowDownload: boolean;
  allowUpload: boolean;
  manage: boolean;
  actorKey: string;
  name: string;
}
export interface ProjectDetail {
  project: Project;
  files: ProjectFile[];
  comments: Comment[];
  questions: Question[];
  answers: Answer[];
  activities: Activity[];
  access: Access;
}
