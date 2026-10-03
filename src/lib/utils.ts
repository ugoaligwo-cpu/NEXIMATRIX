export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(
  value: number,
  options: Intl.NumberFormatOptions = {},
): string {
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;
  const minimumFractionDigits =
    options.minimumFractionDigits ?? Math.min(2, maximumFractionDigits);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    ...options,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(date: string): string {
  const normalized = date.includes("T") ? date : `${date.replace(" ", "T")}Z`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(normalized));
}
