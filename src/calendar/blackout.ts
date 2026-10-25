import { parseIsoDateOnly } from "./dateOnly";

/** One inclusive interval. Session only, and off until the user applies dates. */
export type BlackoutInterval = {
  enabled: boolean;
  start: string;
  end: string;
};

export function createBlackout(): BlackoutInterval {
  return { enabled: false, start: "", end: "" };
}

export function blackoutContains(interval: BlackoutInterval, iso: string): boolean {
  return interval.enabled && interval.start !== "" && interval.end !== "" && iso >= interval.start && iso <= interval.end;
}

export function blackoutFromInput(enabled: boolean, start: string, end: string): { interval: BlackoutInterval } | { error: string } {
  if (!enabled) return { interval: { enabled: false, start, end } };
  if (!parseIsoDateOnly(start) || !parseIsoDateOnly(end) || end < start) {
    return { error: "Choose a valid start and end date." };
  }
  return { interval: { enabled: true, start, end } };
}
