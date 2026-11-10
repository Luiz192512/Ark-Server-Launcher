import type { ReactNode } from "react";
import type { ServerStateName } from "../lib/native";
import { t, type MessageKey } from "../i18n";
import { HexLogo } from "./HexLogo";
import { InfoIcon, MapIcon, PulseIcon, SlidersIcon } from "./Icons";

export type Screen = "maps" | "dashboard" | "settings" | "about";

const ITEMS: { screen: Screen; label: MessageKey; icon: ReactNode }[] = [
  { screen: "maps", label: "nav.maps", icon: <MapIcon /> },
  { screen: "dashboard", label: "nav.dashboard", icon: <PulseIcon /> },
  { screen: "settings", label: "nav.settings", icon: <SlidersIcon /> },
  { screen: "about", label: "nav.about", icon: <InfoIcon /> },
];

interface Props {
  current: Screen;
  serverState: ServerStateName;
  onNavigate: (screen: Screen) => void;
}

export function Sidebar({ current, serverState, onNavigate }: Props) {
  return (
    <nav className="sidebar" aria-label={t("nav.label")}>
      <div className="sidebar__brand">
        <HexLogo />
        <div className="sidebar__name">
          ENZ
          <span>{t("app.subtitle")}</span>
        </div>
      </div>
      {ITEMS.map((item) => (
        <button
          key={item.screen}
          type="button"
          className="sidebar__link"
          aria-current={item.screen === current ? "page" : undefined}
          onClick={() => onNavigate(item.screen)}
        >
          {item.icon}
          {t(item.label)}
        </button>
      ))}
      <div className="sidebar__spacer" />
      <div className="sidebar__status" role="status">
        <span className={`dot dot--${serverState}`} aria-hidden="true" />
        {t(`state.sidebar.${serverState}`)}
      </div>
    </nav>
  );
}
