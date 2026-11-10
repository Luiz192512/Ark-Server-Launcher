import type { ServerStateName } from "../lib/native";

interface Props {
  state: ServerStateName;
  /** What pressing it does right now, also its accessible name. */
  label: string;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * The hexagonal power button from the phone design (the one that turns the
 * PC on from far away). Its color follows the server state.
 */
export function PowerButton({ state, label, disabled, onPress }: Props) {
  return (
    <button
      type="button"
      className={`power power--${state}`}
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
    >
      <svg
        className="power__hex"
        aria-hidden="true"
        width="120"
        height="132"
        viewBox="0 0 120 132"
      >
        <path d="M60 4 L112 34 L112 98 L60 128 L8 98 L8 34 Z" />
        <g transform="translate(36 42) scale(2)">
          <path d="M12 3v8" />
          <path d="M7 6.5a7 7 0 1 0 10 0" />
        </g>
      </svg>
      <span className="power__label" aria-hidden="true">
        {label}
      </span>
    </button>
  );
}
