import type {
  DeviceCommandField,
  DeviceCommandValues,
} from "@/lib/interfaces/device-playground";

export function defaultCommandValues(
  fields: DeviceCommandField[],
): DeviceCommandValues {
  return Object.fromEntries(
    fields.map((field) => [field.name, field.defaultValue]),
  );
}
