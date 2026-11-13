import { API_USAGE_ID_SEGMENT_PATTERN } from "../constants/api-keys";

export function usageEndpointOf(method: string, path: string): string {
  const normalizedPath = path
    .split("/")
    .map((segment) =>
      API_USAGE_ID_SEGMENT_PATTERN.test(segment) ? "{id}" : segment,
    )
    .join("/");
  return `${method.toUpperCase()} ${normalizedPath}`;
}
