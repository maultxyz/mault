import { Input } from "@/components/ui/input";
import { ListRow } from "@/components/ui/list-row";
import type { BinNumberSettingRowProps } from "@/lib/interfaces/rules";

export function BinNumberSettingRow({
  title,
  description,
  placeholder,
  value,
  disabled = false,
  onChange,
}: BinNumberSettingRowProps) {
  return (
    <ListRow
      title={title}
      subtitle={description}
      subtitleNumberOfLines={0}
      rightIsInteractive
      right={
        <Input
          compact
          accessibilityLabel={title}
          keyboardType="number-pad"
          placeholder={placeholder}
          editable={!disabled}
          value={value == null ? "" : String(value)}
          onChangeText={(text) => {
            const digits = text.replace(/\D/g, "");
            onChange(digits === "" ? null : Number(digits));
          }}
        />
      }
    />
  );
}
