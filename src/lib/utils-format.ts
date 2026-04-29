export function normalizePhone(input: string): string {
  return input.replace(/[^0-9+]/g, "").replace(/^00/, "+");
}



export function formatDate(value: Date | string | number | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
