import { ptBR, type MessageKey } from "./pt-BR";

const table: Record<MessageKey, string> = ptBR;

export type { MessageKey };

export function t(
  key: MessageKey,
  params: Record<string, string> = {},
): string {
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, value),
    table[key],
  );
}
