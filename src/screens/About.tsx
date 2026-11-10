import { HexLogo } from "../components/HexLogo";
import { t } from "../i18n";
import type { AppInfo } from "../lib/native";

export function About({ info }: { info: AppInfo | null }) {
  return (
    <main className="screen screen--center">
      <section className="about">
        <HexLogo size={104} />
        <h1 className="about__title">{t("about.title")}</h1>
        <div className="about__version">
          {t("about.version", { version: info?.version ?? "" })}
        </div>
        <p className="about__body">{t("about.body")}</p>
        <p className="about__notice">{t("about.notice")}</p>
      </section>
    </main>
  );
}
