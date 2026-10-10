import type { z } from "zod";
import type { PUBLIC_API_ENDPOINTS } from "../constants/public-api.constant";

export interface PublicApiEndpoint {
  operationId: string;
  method: "get";
  path: string;
  tag: string;
  summary: string;
  description: string;
  pathParams?: z.ZodObject;
  query?: z.ZodObject;
  response: z.ZodType;
}

export type PublicApiOperationId =
  (typeof PUBLIC_API_ENDPOINTS)[number]["operationId"];

export interface OpenApiDocumentOptions {
  version: string;
}
