import { t } from "../i18n";
import { formatSaveSize } from "../lib/format";
import { mapArt } from "../lib/mapArt";
import type { MapView } from "../lib/native";

interface Props {
  map: MapView;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function MapCard({ map, selected, onSelect }: Props) {
  const save = formatSaveSize(map.saveBytes);
  return (
    <button
      type="button"
      className={`map-card${selected ? " map-card--selected" : ""}`}
      style={{ background: mapArt(map.id) }}
      aria-pressed={selected}
      disabled={!map.installed}
      onClick={() => onSelect(map.id)}
    >
      <span className="map-card__shade" />
      <span className="map-card__ring" />
      <span className="map-card__text">
        <span className="map-card__name">{map.displayName}</span>
        <span className="map-card__meta">
          {map.installed
            ? save
              ? t("maps.save", { value: save })
              : t("maps.noSave")
            : t("maps.notInstalled")}
          {map.dlcRequired ? ` · ${t("maps.dlc")}` : ""}
        </span>
      </span>
    </button>
  );
}
