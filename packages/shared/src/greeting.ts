export const GREETING_MORNING_END_HOUR = 12;
export const GREETING_AFTERNOON_END_HOUR = 18;

export type GreetingPeriod = "morning" | "afternoon" | "evening";

export function greetingPeriodFor(date: Date): GreetingPeriod {
  const hour = date.getHours();
  if (hour < GREETING_MORNING_END_HOUR) return "morning";
  if (hour < GREETING_AFTERNOON_END_HOUR) return "afternoon";
  return "evening";
}
