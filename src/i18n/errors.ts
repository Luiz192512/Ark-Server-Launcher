import { t } from "./index";

/** Turns an error code from the native core into a translated message. */
export function describeError(raw: unknown): string {
  const code = String(raw);
  const [name, ...rest] = code.split(":");
  const arg = rest.join(":");
  switch (name) {
    case "not_configured":
    case "registry_unreadable":
    case "map_not_found":
    case "map_not_installed":
    case "session_name_empty":
    case "session_name_invalid":
    case "busy":
    case "not_running":
    case "server_running":
      return t(`error.${name}`);
    case "invalid_option":
      return t("error.invalid_option", { option: arg });
    case "backup_not_found":
      return t("error.backup_not_found");
    case "custom_cmdline":
    case "custom_bad_key":
    case "custom_bad_section":
    case "custom_bad_value":
    case "custom_managed":
      // The screen checks the same rules first, so this only shows if the two drift apart.
      return t("error.custom", { code });
    case "invalid_mod":
    case "mod_missing":
      return t(`error.${name}`, { mod: arg });
    case "port_in_use":
      return t("error.port_in_use", { port: arg });
    case "already_running":
      return t("error.already_running", { pid: arg });
    case "spawn_failed":
      return t("error.spawn_failed", { reason: arg });
    case "backup_failed":
      return t("error.backup_failed", { reason: arg });
    case "rcon_not_configured":
    case "rcon_auth_failed":
      return t(`error.${name}`);
    case "rcon_unreachable":
    case "rcon_protocol":
      return t(`error.${name}`, { reason: arg });
    default:
      return t("error.generic", { reason: code });
  }
}
