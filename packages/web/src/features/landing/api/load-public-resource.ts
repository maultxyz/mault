import { publicGet } from "@/lib/api/client";
import type { Result } from "@magic-vault/shared";

const publicResourceRequests = new Map<string, Promise<Result<unknown>>>();

export function loadPublicResource<T>(path: string): Promise<Result<T>> {
  const existingRequest = publicResourceRequests.get(path);
  if (existingRequest) return existingRequest as Promise<Result<T>>;
  const request = publicGet<Result<T>>(path).catch((error: unknown) => {
    publicResourceRequests.delete(path);
    throw error;
  });
  publicResourceRequests.set(path, request);
  return request;
}
