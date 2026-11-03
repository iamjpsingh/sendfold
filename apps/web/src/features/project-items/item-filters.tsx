import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
export function ItemFilters({
  filter,
  setFilter,
  hideCompleted,
  setHideCompleted,
}: {
  filter: string;
  setFilter: (value: string) => void;
  hideCompleted: boolean;
  setHideCompleted: (value: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-44" aria-label="Filter links and tasks">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All items</SelectItem>
          <SelectItem value="link">Links</SelectItem>
          <SelectItem value="task">Tasks</SelectItem>
          <SelectItem value="important">Important</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Switch
          id="hide-completed"
          checked={hideCompleted}
          onCheckedChange={setHideCompleted}
        />
        <Label htmlFor="hide-completed" className="text-sm font-normal">
          Hide completed
        </Label>
      </div>
    </div>
  );
}
