import { HOME_AFTERNOON_END_HOUR, HOME_MORNING_END_HOUR } from "@/lib/constants/home";

export function greetingKeyFor(date: Date): "home.greeting.morning" | "home.greeting.afternoon" | "home.greeting.evening" {
  const hour = date.getHours();
  if (hour < HOME_MORNING_END_HOUR) return "home.greeting.morning";
  if (hour < HOME_AFTERNOON_END_HOUR) return "home.greeting.afternoon";
  return "home.greeting.evening";
}
