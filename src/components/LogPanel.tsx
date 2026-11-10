import { useEffect, useRef } from "react";
import { t } from "../i18n";

function tone(line: string): string {
  if (/error|exception|fatal|crash/i.test(line)) return "log__line--bad";
  if (/warn/i.test(line)) return "log__line--warn";
  if (/has successfully started!/i.test(line)) return "log__line--ok";
  return "";
}

export function LogPanel({ lines }: { lines: string[] }) {
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = body.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <section className="log" aria-label={t("dash.log")}>
      <div className="log__head">
        <span>{t("dash.log")}</span>
        <span>{t("dash.logLines")}</span>
      </div>
      <div className="log__body" tabIndex={0} ref={body}>
        {lines.length === 0 && (
          <div className="log__line">{t("dash.logEmpty")}</div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={`log__line ${tone(line)}`}>
            {line}
          </div>
        ))}
      </div>
    </section>
  );
}
