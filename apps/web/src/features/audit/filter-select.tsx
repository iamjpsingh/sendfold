import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { locationInfo } from "./metadata";

export const identityOptions = [
  ["all", "All visitors"],
  ["member", "Team accounts"],
  ["guest", "Guests"],
  ["anonymous", "Anonymous"],
  ["connector", "AI connections"],
  ["legacy", "Earlier records"],
];
export const periodOptions = [
  ["all", "All time"],
  ["1", "Last 24 hours"],
  ["7", "Last 7 days"],
  ["30", "Last 30 days"],
];
export function countryOptions(countries: string[]) {
  return [
    ["all", "All countries"],
    ["unknown", "Not recorded"],
    ...countries.map((code) => {
      const country = locationInfo(code);
      return [code, `${country.flag} ${country.name}`.trim()];
    }),
  ];
}
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="w-full text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([id, text]) => (
          <SelectItem key={id} value={id}>
            {text}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
