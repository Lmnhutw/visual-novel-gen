"use client";

type SliderFieldProps = {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  lowLabel: string;
  midLabel: string;
  highLabel: string;
};

export function SliderField({
  label,
  value,
  onChange,
  lowLabel,
  midLabel,
  highLabel,
}: SliderFieldProps) {
  const displayValue = value === "" ? 50 : value;

  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase text-on-surface-variant">
        {label}
        <button
          className="rounded px-1.5 py-0.5 text-[11px] text-primary transition hover:bg-surface-container-high"
          type="button"
          onClick={() => onChange("")}
        >
          Clear
        </button>
      </span>
      <input
        className="w-full accent-control"
        max={100}
        min={0}
        type="range"
        value={displayValue}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="grid grid-cols-3 gap-2 text-[11px] leading-4 text-on-surface-variant">
        <span>{lowLabel}</span>
        <span className="text-center">{midLabel}</span>
        <span className="text-right">{highLabel}</span>
      </div>
      <span className="font-mono text-xs text-primary">
        {value === "" ? "Not set" : value}
      </span>
    </label>
  );
}
