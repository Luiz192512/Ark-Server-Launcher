import { useCallback, useEffect, useState } from "react";
import { Sidebar, type Screen } from "./components/Sidebar";
import { usePolling } from "./hooks/usePolling";
import {
  getAppInfo,
  getSettings,
  listMaps,
  serverOverview,
  type AppInfo,
  type MapView,
  type Settings as SettingsData,
} from "./lib/native";
import { About } from "./screens/About";
import { Dashboard } from "./screens/Dashboard";
import { MapSelect } from "./screens/MapSelect";
import { Settings } from "./screens/Settings";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/rajdhani/600.css";
import "@fontsource/rajdhani/700.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/shell.css";
import "./styles/screens.css";

function App() {
  const [screen, setScreen] = useState<Screen>("maps");
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [maps, setMaps] = useState<MapView[] | null>(null);
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const overview = usePolling(serverOverview, 1500);

  const reloadConfig = useCallback(async () => {
    const [s, m] = await Promise.all([getSettings(), listMaps()]);
    setSettings(s);
    setMaps(m);
  }, []);

  useEffect(() => {
    void getAppInfo().then(setInfo);
    void reloadConfig();
  }, [reloadConfig]);

  const onChanged = useCallback(async () => {
    await Promise.all([overview.refresh(), reloadConfig()]);
  }, [overview, reloadConfig]);

  const serverState = overview.data?.state.state ?? "stopped";

  return (
    <div className="app">
      <Sidebar
        current={screen}
        serverState={serverState}
        onNavigate={setScreen}
      />
      {screen === "maps" && (
        <MapSelect
          maps={maps}
          overview={overview.data}
          settings={settings}
          onStarted={() => {
            void onChanged();
            setScreen("dashboard");
          }}
          onOpenSettings={() => setScreen("settings")}
        />
      )}
      {screen === "dashboard" && (
        <Dashboard
          overview={overview.data}
          maps={maps}
          settings={settings}
          onChanged={onChanged}
          onPickMap={() => setScreen("maps")}
        />
      )}
      {screen === "settings" && (
        <Settings settings={settings} onSaved={onChanged} />
      )}
      {screen === "about" && <About info={info} />}
    </div>
  );
}

export default App;
