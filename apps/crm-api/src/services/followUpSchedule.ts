export function followUpsOverlap(start: Date, minutes: number, otherStart: Date, otherMinutes: number): boolean {
  const startMs = start.getTime();
  const otherMs = otherStart.getTime();
  return startMs < otherMs + otherMinutes * 60_000 && otherMs < startMs + minutes * 60_000;
}
