const pad = (n: number) => String(n).padStart(2, "0");

export function formatUptime(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = Math.floor(totalSecs % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatMemory(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1).replace(".", ",")} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatSaveSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
}
