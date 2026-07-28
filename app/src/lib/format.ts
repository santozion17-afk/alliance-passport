export function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatUsdcMinor(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function truncateAddress(value: string, lead = 5, tail = 5): string {
  if (value.length <= lead + tail + 1) {
    return value;
  }

  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}
