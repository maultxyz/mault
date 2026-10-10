import { z } from "zod";
import { PUBLIC_API_PAGE_SIZE_MAX } from "./constants/api-keys.constant";
import {
  PUBLIC_API_ENDPOINTS,
  PUBLIC_API_KEY_HEADER,
  PUBLIC_API_TITLE,
} from "./constants/public-api.constant";
import {
  WEBHOOK_DELIVERY_HEADER,
  WEBHOOK_EVENT_HEADER,
  WEBHOOK_SIGNATURE_HEADER,
} from "./constants/webhooks.constant";
import type {
  OpenApiDocumentOptions,
  PublicApiEndpoint,
} from "./interfaces/public-api.interface";
import {
  apiCardScannedEventSchema,
  apiCardsStoredEventSchema,
  apiErrorSchema,
  apiWebhookTestEventSchema,
} from "./schemas/public-api.schema";

const SCHEMA_REF_PREFIX = "#/components/schemas/";

function schemaRef(schema: z.ZodType): { $ref: string } {
  const id = z.globalRegistry.get(schema)?.id;
  if (!id) throw new Error("Public API schemas need a registered id.");
  return { $ref: `${SCHEMA_REF_PREFIX}${id}` };
}

function jsonBody(schema: z.ZodType, description: string) {
  return {
    description,
    content: { "application/json": { schema: schemaRef(schema) } },
  };
}

function parameters(
  location: "path" | "query",
  schema: z.ZodObject | undefined,
) {
  if (!schema) return [];
  return Object.entries(schema.shape).map(([name, field]) => {
    const fieldSchema = field as z.ZodType;
    const { description, ...json } = z.toJSONSchema(fieldSchema, {
      io: "input",
      unrepresentable: "any",
    }) as Record<string, unknown>;
    delete json.$schema;
    return {
      name,
      in: location,
      required: location === "path" || !fieldSchema.safeParse(undefined).success,
      description,
      schema: json,
    };
  });
}

const rateLimitHeaders = {
  "X-RateLimit-Limit": {
    description: "Requests allowed per minute for this key.",
    schema: { type: "integer" },
  },
  "X-RateLimit-Remaining": {
    description: "Requests left in the current window.",
    schema: { type: "integer" },
  },
  "X-RateLimit-Reset": {
    description: "Seconds until the window resets.",
    schema: { type: "integer" },
  },
};

function operation(endpoint: PublicApiEndpoint) {
  const error = (description: string) => jsonBody(apiErrorSchema, description);
  return {
    operationId: endpoint.operationId,
    tags: [endpoint.tag],
    summary: endpoint.summary,
    description: endpoint.description,
    parameters: [
      ...parameters("path", endpoint.pathParams),
      ...parameters("query", endpoint.query),
    ],
    responses: {
      "200": {
        ...jsonBody(endpoint.response, "Success."),
        headers: rateLimitHeaders,
      },
      ...(endpoint.query ? { "400": error("A parameter is invalid.") } : {}),
      "401": error("The API key is missing, invalid or revoked."),
      "403": error("The organization's plan doesn't include API access."),
      ...(endpoint.pathParams
        ? { "404": error("No object with that id.") }
        : {}),
      "429": {
        ...error("Too many requests."),
        headers: {
          ...rateLimitHeaders,
          "Retry-After": {
            description: "Seconds to wait before retrying.",
            schema: { type: "integer" },
          },
        },
      },
      "500": error("Something went wrong on Mault's side."),
    },
  };
}

function webhook(schema: z.ZodType, summary: string, description: string) {
  return {
    post: {
      summary,
      description,
      parameters: [
        {
          name: WEBHOOK_EVENT_HEADER,
          in: "header",
          required: true,
          description: "The event type.",
          schema: { type: "string" },
        },
        {
          name: WEBHOOK_DELIVERY_HEADER,
          in: "header",
          required: true,
          description: "The event id. Retries reuse it.",
          schema: { type: "string", format: "uuid" },
        },
        {
          name: WEBHOOK_SIGNATURE_HEADER,
          in: "header",
          required: true,
          description:
            "t=<unix seconds>,v1=<hex HMAC-SHA256 of '<t>.<raw body>' keyed with the webhook's signing secret>.",
          schema: { type: "string" },
        },
      ],
      requestBody: jsonBody(schema, "The event."),
      responses: {
        "2XX": {
          description:
            "Any 2xx within 10 seconds counts as delivered. Anything else is retried.",
        },
      },
    },
  };
}

function componentSchemas(): Record<string, unknown> {
  const { schemas } = z.toJSONSchema(z.globalRegistry, {
    uri: (id) => `${SCHEMA_REF_PREFIX}${id}`,
  }) as { schemas: Record<string, Record<string, unknown>> };
  return Object.fromEntries(
    Object.entries(schemas).map(([id, schema]) => {
      const rest = { ...schema };
      delete rest.$schema;
      delete rest.$id;
      delete rest.id;
      return [id, rest];
    }),
  );
}

export function buildPublicApiOpenApiDocument({
  version,
}: OpenApiDocumentOptions) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const endpoint of PUBLIC_API_ENDPOINTS) {
    paths[endpoint.path] = {
      ...paths[endpoint.path],
      [endpoint.method]: operation(endpoint),
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: PUBLIC_API_TITLE,
      version,
      description: `Read-only lookup of where an organization's scanned cards are stored. Lists are paged with has_more and next_page (at most ${PUBLIC_API_PAGE_SIZE_MAX} per page), and every object carries an object field naming its type, like Scryfall's API.`,
    },
    servers: [{ url: "/", description: "Your Mault API server" }],
    security: [{ apiKey: [] }],
    tags: [...new Set(PUBLIC_API_ENDPOINTS.map((e) => e.tag))].map(
      (name) => ({ name }),
    ),
    paths,
    webhooks: {
      "card.scanned": webhook(
        apiCardScannedEventSchema,
        "Card scanned",
        "A card was scanned and saved, or an unmatched scan was identified. It has no location yet.",
      ),
      "cards.stored": webhook(
        apiCardsStoredEventSchema,
        "Cards stored",
        "A bin was put away into a storage location. At most 200 cards per event.",
      ),
      "webhook.test": webhook(
        apiWebhookTestEventSchema,
        "Test event",
        "Sent by Send test event in the app.",
      ),
    },
    components: {
      securitySchemes: {
        apiKey: {
          type: "apiKey",
          in: "header",
          name: PUBLIC_API_KEY_HEADER,
          description:
            "An organization API key from Settings > Integrations > API keys.",
        },
      },
      schemas: componentSchemas(),
    },
  };
}
