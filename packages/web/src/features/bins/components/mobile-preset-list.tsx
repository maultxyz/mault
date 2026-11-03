import { MobileListRow } from "@/components/mobile-list-row";
import { usePresetPicker } from "@/features/bins/api/use-preset-picker";
import { PresetPickerBadge } from "@/features/bins/components/preset-picker-badge";
import { MOBILE_LIST_CLASS } from "@/lib/constants/nav";
import type { MobilePresetListProps } from "@/lib/interfaces/bins";

export function MobilePresetList({ onPresetChosen }: MobilePresetListProps) {
  const picker = usePresetPicker();

  return (
    <div className={MOBILE_LIST_CLASS}>
      {picker.items.map((item) => (
        <MobileListRow
          key={item.guid}
          label={item.name}
          selected={picker.isSelected(item)}
          disabled={picker.isChoosing}
          value={<PresetPickerBadge item={item} />}
          onClick={() => {
            picker.choose(item);
            onPresetChosen();
          }}
        />
      ))}
    </div>
  );
}
