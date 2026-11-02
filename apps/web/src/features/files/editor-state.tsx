import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { useBlocker } from "@tanstack/react-router";
import { toast } from "sonner";
const EditorContext = createContext<{
  editing: boolean;
  setEditing: Dispatch<SetStateAction<boolean>>;
}>({ editing: false, setEditing: () => {} });
export function EditorProvider({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  return (
    <EditorContext.Provider value={{ editing, setEditing }}>
      {children}
    </EditorContext.Provider>
  );
}
export const useEditorState = () => useContext(EditorContext);
export function useEditingGuard(editing: boolean) {
  const context = useEditorState();
  useEffect(() => {
    context.setEditing(editing);
    return () => context.setEditing(false);
  }, [editing, context.setEditing]);
  useBlocker({
    shouldBlockFn: () => {
      if (editing)
        toast.info("Save or discard the workbook changes before leaving.");
      return editing;
    },
    enableBeforeUnload: editing,
  });
}
