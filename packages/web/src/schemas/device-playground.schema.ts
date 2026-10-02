import type { DeviceCommandField } from "@/lib/interfaces/device-playground";
import { z } from "zod";

function fieldSchema(field: DeviceCommandField): z.ZodType {
  switch (field.type) {
    case "number": {
      let schema = z.number({ error: "Required" }).int();
      if (field.min != null) schema = schema.min(field.min);
      if (field.max != null) schema = schema.max(field.max);
      return schema;
    }
    case "optionalNumber": {
      let schema = z.number().int();
      if (field.min != null) schema = schema.min(field.min);
      if (field.max != null) schema = schema.max(field.max);
      return schema.nullable();
    }
    case "select":
      return z.enum((field.options ?? []) as [string, ...string[]]);
    case "boolean":
      return z.boolean();
  }
}

export function createDeviceCommandSchema(fields: DeviceCommandField[]) {
  return z.object(
    Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])),
  );
}

export const deviceRawCommandSchema = z.object({
  line: z.string().trim().min(1, "Enter a command"),
  timeoutMs: z.number().int().min(100).max(60_000),
});

export type DeviceRawCommandValues = z.infer<typeof deviceRawCommandSchema>;
