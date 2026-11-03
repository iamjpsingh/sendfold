import { useNavigate, useSearch } from "@tanstack/react-router";
export function projectSearch(search: Record<string, unknown>): {
  tab?: string;
} {
  return {
    tab: [
      "files",
      "questions",
      "feedback",
      "items",
      "responses",
      "activity",
    ].includes(String(search.tab))
      ? String(search.tab)
      : "files",
  };
}
export function useProjectTab(
  projectId: string,
  token?: string,
): [string, (value: string) => void] {
  const search = useSearch({ strict: false }) as { tab?: string };
  const navigate = useNavigate();
  return [
    search.tab ?? "files",
    (value) => {
      if (token)
        void navigate({
          to: "/s/$token",
          params: { token },
          search: { tab: value },
          replace: true,
          resetScroll: false,
        });
      else
        void navigate({
          to: "/projects/$projectId",
          params: { projectId },
          search: { tab: value },
          replace: true,
          resetScroll: false,
        });
    },
  ];
}
