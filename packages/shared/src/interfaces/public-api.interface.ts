import type { z } from "zod";
import type { ApiKeyScope } from "./api-keys.interface";
import type { PUBLIC_API_ENDPOINTS } from "../constants/public-api.constant";

export interface PublicApiEndpoint {
  operationId: string;
  method: "get" | "post" | "delete";
  path: string;
  tag: string;
  summary: string;
  description: string;
  scope: ApiKeyScope;
  pathParams?: z.ZodObject;
  query?: z.ZodObject;
  body?: z.ZodObject;
  response: z.ZodType | null;
}

export type PublicApiOperationId =
  (typeof PUBLIC_API_ENDPOINTS)[number]["operationId"];

export interface OpenApiDocumentOptions {
  version: string;
}
