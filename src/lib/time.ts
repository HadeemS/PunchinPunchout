import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  differenceInMinutes,
  subWeeks,
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/db";

export const DEFAULT_TIMEZONE = "America/New_York";
export const MISSED_PUNCH_HOURS = 16;

export async function getTimezone(): Promise<string> {
  const setting = await prisma.setting.findUnique({
    where: { key: "timezone" },
  });
  return setting?.value ?? DEFAULT_TIMEZONE;
}

export async function getSetting(key: string, fallback: string): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}

export function formatTime(date: Date, timezone: string): string {
  return format(toZonedTime(date, timezone), "h:mm a");
}

export function formatDate(date: Date, timezone: string): string {
  return format(toZonedTime(date, timezone), "EEE, MMM d, yyyy");
}

export function formatDateTime(date: Date, timezone: string): string {
  return `${formatDate(date, timezone)} ${formatTime(date, timezone)}`;
}

export function formatDateShort(date: Date, timezone: string): string {
  return format(toZonedTime(date, timezone), "MMM d, yyyy");
}

export function formatDuration(minutes: number): string {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function minutesToDecimalHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

export function entryDurationMinutes(
  clockIn: Date,
  clockOut: Date | null,
  now: Date = new Date()
): number {
  const end = clockOut ?? now;
  return Math.max(0, differenceInMinutes(end, clockIn));
}

export function isMissedPunch(
  clockIn: Date,
  clockOut: Date | null,
  now: Date = new Date()
): boolean {
  if (clockOut) return false;
  const hours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
  return hours > MISSED_PUNCH_HOURS;
}

/** Start of day in business timezone, returned as UTC Date */
export function startOfDayInTz(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  const start = startOfDay(zoned);
  return fromZonedTime(start, timezone);
}

/** End of day in business timezone, returned as UTC Date */
export function endOfDayInTz(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  const end = endOfDay(zoned);
  return fromZonedTime(end, timezone);
}

/** Monday start of week in business timezone */
export function startOfWeekInTz(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  const start = startOfWeek(zoned, { weekStartsOn: 1 });
  return fromZonedTime(startOfDay(start), timezone);
}

export function endOfWeekInTz(date: Date, timezone: string): Date {
  const zoned = toZonedTime(date, timezone);
  const end = endOfWeek(zoned, { weekStartsOn: 1 });
  return fromZonedTime(endOfDay(end), timezone);
}

export function parseLocalDatetimeToUtc(
  localDatetime: string,
  timezone: string
): Date {
  // datetime-local value: "YYYY-MM-DDTHH:mm"
  return fromZonedTime(localDatetime, timezone);
}

export function toLocalDatetimeInputValue(
  date: Date,
  timezone: string
): string {
  return format(toZonedTime(date, timezone), "yyyy-MM-dd'T'HH:mm");
}

export function weekRangesLastN(
  n: number,
  timezone: string,
  from: Date = new Date()
): { start: Date; end: Date; label: string }[] {
  const ranges: { start: Date; end: Date; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const ref = subWeeks(from, i);
    const start = startOfWeekInTz(ref, timezone);
    const end = endOfWeekInTz(ref, timezone);
    const label = `${format(toZonedTime(start, timezone), "MMM d")} – ${format(toZonedTime(end, timezone), "MMM d, yyyy")}`;
    ranges.push({ start, end, label });
  }
  return ranges;
}

export const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
] as const;
