import { InteractionTypeSchema } from "../schemas/interaction.schemas.js";

export const ACTIVITY_MINUTES: Record<(typeof InteractionTypeSchema)["_type"], number> = {
  EMAIL: 15,
  CALL: 30,
  MEETING: 60,
  SITE_VISIT: 120,
  FOLLOW_UP: 30,
};

export function followUpMinutes(channel: string | null): number {
  return channel && channel in ACTIVITY_MINUTES
    ? ACTIVITY_MINUTES[channel as keyof typeof ACTIVITY_MINUTES]
    : ACTIVITY_MINUTES.FOLLOW_UP;
}

export function planningWindow(weekStart: string) {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { start, end };
}
