/**
 * Timezone utilities for converting send-hour between user-selected timezone and UTC.
 * Backend stores hour in UTC (0-23).
 */

export const SUPPORTED_SEND_TIMEZONES = [
  { value: "America/New_York", label: "ET (Eastern)" },
  { value: "America/Chicago", label: "CT (Central)" },
  { value: "America/Denver", label: "MT (Mountain)" },
  { value: "America/Los_Angeles", label: "PT (Pacific)" },
  { value: "UTC", label: "UTC" },
] as const;

export type SendTimezoneId = (typeof SUPPORTED_SEND_TIMEZONES)[number]["value"];

const DEFAULT_REF_DATE = new Date(Date.UTC(2024, 0, 15, 12, 0, 0));

/**
 * Hours to add to local hour in the given timezone to get UTC hour.
 * E.g. PST: local 9 AM -> 9 + 8 = 17 UTC.
 */
export function getTimezoneOffsetHours(
  timezoneId: string,
  refDate: Date = DEFAULT_REF_DATE
): number {
  if (timezoneId === "UTC") return 0;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezoneId,
    hour: "numeric",
    hour12: false,
  });
  const localHour = parseInt(formatter.format(refDate), 10);
  const utcHour = refDate.getUTCHours();
  return (utcHour - localHour + 24) % 24;
}

/**
 * Convert an hour (0-23) in the given timezone to UTC hour (0-23).
 */
export function hourInTimezoneToUTC(
  localHour: number,
  timezoneId: string,
  refDate?: Date
): number {
  const offset = getTimezoneOffsetHours(timezoneId, refDate);
  return (localHour + offset) % 24;
}

/**
 * Convert UTC hour (0-23) to hour (0-23) in the given timezone (for display).
 */
export function hourUTCToTimezone(
  utcHour: number,
  timezoneId: string,
  refDate?: Date
): number {
  const offset = getTimezoneOffsetHours(timezoneId, refDate ?? DEFAULT_REF_DATE);
  return (utcHour - offset + 24) % 24;
}

/**
 * Format hour (0-23) as "9 AM" / "12 PM" etc.
 */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}
