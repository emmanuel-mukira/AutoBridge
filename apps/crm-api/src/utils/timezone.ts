export const KENYA_TIMEZONE = "Africa/Nairobi";

const TIMEZONE_OFFSET_MINUTES = Number(
  process.env.APP_TIMEZONE_OFFSET_MINUTES ?? 180,
);

interface KenyaDateParts {
  year: number;
  month: number;
  day: number;
}

const kenyaFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KENYA_TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

const getKenyaDateParts = (date: Date): KenyaDateParts => {
  const parts = kenyaFormatter.formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? 0);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 1) - 1;
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 1);
  return { year, month, day };
};

const toKenyaDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): Date =>
  new Date(
    Date.UTC(year, month, day, hour, minute, second, millisecond) -
      TIMEZONE_OFFSET_MINUTES * 60 * 1000,
  );

/**
 * Convert a date to the start of day in Kenya timezone (returns UTC date).
 */
export const toZonedDayStart = (date: Date): Date => {
  const { year, month, day } = getKenyaDateParts(date);
  return toKenyaDate(year, month, day, 0, 0, 0, 0);
};

/**
 * Convert a date to the end of day in Kenya timezone (returns UTC date).
 */
export const toZonedDayEnd = (date: Date): Date => {
  const { year, month, day } = getKenyaDateParts(date);
  return toKenyaDate(year, month, day, 23, 59, 59, 999);
};

/**
 * Convert a date to the start of month in Kenya timezone (returns UTC date).
 */
export const toZonedMonthStart = (date: Date): Date => {
  const { year, month } = getKenyaDateParts(date);
  return toKenyaDate(year, month, 1, 0, 0, 0, 0);
};

/**
 * Convert a date to the end of month in Kenya timezone (returns UTC date).
 */
export const toZonedMonthEnd = (date: Date): Date => {
  const { year, month } = getKenyaDateParts(date);
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return toKenyaDate(year, month, lastDay, 23, 59, 59, 999);
};
