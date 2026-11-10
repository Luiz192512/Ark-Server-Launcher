import { useCallback, useEffect, useRef, useState } from "react";
import { describeError } from "../i18n/errors";
import { t } from "../i18n";
import { listIniBackups, restoreIniBackup } from "../lib/native";

/** Backup folders are named by the unix time in milliseconds of the copy. */
export const backupDate = (name: string) =>
  new Date(Number(name)).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

interface Props {
  running: boolean;
  /** After a restore (or a new list): the rules tab reads the files and the count again. */
  onChanged: () => void;
}

export function BackupsPanel({ running, onChanged }: Props) {
  const [names, setNames] = useState<string[] | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  const load = useCallback(
    () =>
      listIniBackups()
        .then(setNames)
        .catch(() => setNames([])),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!asking || dialog.current?.open) return;
    dialog.current?.showModal();
    // The safe choice gets the focus (React's autoFocus does not reach a closed dialog).
    cancel.current?.focus();
  }, [asking]);

  const close = () => {
    if (dialog.current?.open) dialog.current.close();
    setAsking(null);
    opener.current?.focus();
  };

  async function restore(name: string) {
    setBusy(true);
    try {
      await restoreIniBackup(name);
      setNotice({
        kind: "ok",
        text: t("backups.restored", { when: backupDate(name) }),
      });
      await load();
      onChanged();
    } catch (err) {
      setNotice({
        kind: "error",
        text: t("backups.failed", { reason: describeError(err) }),
      });
    } finally {
      setBusy(false);
      close();
    }
  }

  if (!names) return <p role="status">{t("backups.loading")}</p>;
  return (
    <div className="backups">
      {running && <p className="alert alert--warn">{t("backups.running")}</p>}
      {notice && (
        <p
          className={`alert alert--${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      )}
      {names.length === 0 ? (
        <p className="hint">{t("backups.empty")}</p>
      ) : (
        <div className="stat-table__scroll">
          <table className="backups__table">
            <caption className="hint">{t("backups.caption")}</caption>
            <thead>
              <tr>
                <th scope="col">{t("backups.when")}</th>
                <th scope="col">{t("backups.files")}</th>
                <th scope="col">
                  <span className="sr-only">{t("backups.action")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {names.map((n) => (
                <tr key={n}>
                  <th scope="row">{backupDate(n)}</th>
                  <td>Game.ini, GameUserSettings.ini</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--ghost btn--tiny"
                      aria-haspopup="dialog"
                      aria-label={t("backups.restoreOne", {
                        when: backupDate(n),
                      })}
                      disabled={running || busy}
                      onClick={(ev) => {
                        opener.current = ev.currentTarget;
                        setAsking(n);
                      }}
                    >
                      {t("backups.restoreRow")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <dialog
        ref={dialog}
        className="confirm"
        aria-labelledby="restore-title"
        aria-describedby="restore-text"
        onCancel={(ev) => {
          ev.preventDefault();
          close();
        }}
      >
        <h2 id="restore-title">{t("backups.confirmTitle")}</h2>
        <p id="restore-text">
          {asking && t("backups.confirmText", { when: backupDate(asking) })}
        </p>
        <div className="confirm__actions">
          <button
            type="button"
            ref={cancel}
            className="btn btn--outline btn--small"
            onClick={close}
          >
            {t("backups.cancel")}
          </button>
          <button
            type="button"
            className="btn btn--danger-outline btn--small"
            disabled={busy}
            onClick={() => asking && void restore(asking)}
          >
            {t("backups.restore")}
          </button>
        </div>
      </dialog>
    </div>
  );
}
