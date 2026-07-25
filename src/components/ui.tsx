import { CheckCircle2 } from "lucide-react";
import type { Stat } from "@/lib/app-types";

export function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Metric detail={stat.detail} label={stat.label} value={stat.value} key={stat.label} />
      ))}
    </div>
  );
}

export function Field({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="mb-3 block text-sm font-medium">
      {label}
      <input
        className="mt-1 h-11 w-full rounded-md border border-black/15 px-3 outline-none focus:border-[#1f6f5b]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function SelectField({
  help,
  label,
  onChange,
  options,
  value,
}: {
  help?: string;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="mb-3 block text-sm font-medium">
      {label}
      <select
        className="mt-1 h-11 w-full rounded-md border border-black/15 bg-white px-3 outline-none focus:border-[#1f6f5b]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {help && <span className="mt-1 block text-xs text-[#65605a]">{help}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`flex items-center justify-between gap-3 rounded-md bg-[#f4f1ea] px-3 py-2 ${disabled ? "opacity-70" : ""}`}>
      <span>{label}</span>
      <input checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

export function Metric({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
      <p className="text-sm text-[#65605a]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-[#65605a]">{detail}</p>
    </div>
  );
}

export function ActivityLine({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-md bg-[#f4f1ea] p-3">
      <CheckCircle2 size={16} className="text-[#1f6f5b]" />
      {text}
    </p>
  );
}
