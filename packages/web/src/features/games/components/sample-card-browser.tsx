import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSampleCard } from "@/features/games/api/games";
import {
  humanizeKey,
  inferFieldType,
  isObjectArray,
  isPlainObject,
  pathToFieldKey,
  type PickedField,
} from "@/features/games/lib/field-mapping";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const ARRAY_PREVIEW_LIMIT = 5;

function previewValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return JSON.stringify(value);
}

interface JsonNodeProps {
  path: string;
  keyName: string;
  value: unknown;
  onPick: (field: PickedField) => void;
}

function JsonNode({ path, keyName, value, onPick }: JsonNodeProps) {
  const [open, setOpen] = useState(false);
  const expandable = isPlainObject(value) || isObjectArray(value);

  if (expandable) {
    const entries: [string, unknown][] = isPlainObject(value)
      ? Object.entries(value)
      : (value as unknown[])
          .slice(0, ARRAY_PREVIEW_LIMIT)
          .map((v, i) => [String(i), v]);
    const arrayLength = Array.isArray(value) ? value.length : 0;
    const truncated = arrayLength > ARRAY_PREVIEW_LIMIT;

    return (
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 min-w-0 text-xs font-mono w-full text-left py-0.5 text-muted-foreground hover:text-foreground"
        >
          {open ? (
            <IconChevronDown size={12} className="shrink-0" />
          ) : (
            <IconChevronRight size={12} className="shrink-0" />
          )}
          <span className="text-foreground truncate">{keyName}</span>
          <span className="shrink-0">
            {isPlainObject(value) ? "{…}" : `[${arrayLength}]`}
          </span>
        </button>
        {open && (
          <div className="pl-3 border-l ml-1.5 min-w-0">
            {entries.map(([k, v]) => (
              <JsonNode
                key={k}
                path={`${path}.${k}`}
                keyName={k}
                value={v}
                onPick={onPick}
              />
            ))}
            {truncated && (
              <p className="text-xs text-muted-foreground pl-4 py-0.5">
                +{arrayLength - ARRAY_PREVIEW_LIMIT} more
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        onPick({
          field: pathToFieldKey(path),
          label: humanizeKey(keyName),
          type: inferFieldType(value),
          path,
        })
      }
      className="flex items-center gap-1.5 min-w-0 text-xs font-mono w-full text-left py-0.5 pl-4 rounded hover:bg-accent"
    >
      <span className="text-foreground shrink-0">{keyName}</span>
      <span className="text-muted-foreground truncate min-w-0 flex-1">
        {previewValue(value)}
      </span>
    </button>
  );
}

interface SampleCardBrowserProps {
  gameKey: string;
  onPick: (field: PickedField) => void;
}

export function SampleCardBrowser({ gameKey, onPick }: SampleCardBrowserProps) {
  const { t } = useTranslation("games");
  const [query, setQuery] = useState("");
  const [sampleName, setSampleName] = useState<string | null>(null);
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearch = !!gameKey.trim() && !!query.trim() && !loading;

  async function search() {
    if (!canSearch) return;

    setLoading(true);
    setError(null);
    const result = await getSampleCard(gameKey.trim(), query.trim());
    setLoading(false);

    if (!result.success || !result.data) {
      setError(result.message || t("fieldMapping.loadError"));
      return;
    }
    if (!isPlainObject(result.data.raw)) {
      setError(t("fieldMapping.loadError"));
      return;
    }
    setSampleName(result.data.name);
    setRaw(result.data.raw);
  }

  return (
    <div className="flex flex-col gap-2 overflow-hidden">
      <div className="flex-none">
        <p className="text-sm font-medium">{t("fieldMapping.heading")}</p>
        <p className="text-sm text-muted-foreground">
          {t("fieldMapping.description")}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-none">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
          placeholder={t("fieldMapping.queryPlaceholder")}
        />
        <Button
          type="button"
          variant="outline"
          onClick={search}
          disabled={!canSearch}
        >
          {loading ? t("fieldMapping.loading") : t("fieldMapping.search")}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {raw && (
        <>
          {sampleName && (
            <p className="text-sm text-muted-foreground">
              {t("fieldMapping.sampleName", { name: sampleName })}
            </p>
          )}
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col">
              {Object.entries(raw).map(([k, v]) => (
                <JsonNode
                  key={k}
                  path={k}
                  keyName={k}
                  value={v}
                  onPick={onPick}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
