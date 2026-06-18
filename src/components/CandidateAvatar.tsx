export function CandidateAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const dimensions = size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";

  return (
    <span className={`${dimensions} flex shrink-0 items-center justify-center rounded-lg bg-slate-950 font-semibold text-white shadow-sm`}>
      {initials || "RI"}
    </span>
  );
}
