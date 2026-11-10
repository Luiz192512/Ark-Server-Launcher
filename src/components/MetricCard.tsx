interface Props {
  label: string;
  value: string;
  hint?: string;
  /** 0 to 100. Omit for cards without a bar. */
  bar?: number;
  barClass?: string;
}

export function MetricCard({ label, value, hint, bar, barClass }: Props) {
  return (
    <div className="metric">
      <div className="metric__label">{label}</div>
      <div className="metric__value">{value}</div>
      {hint && <div className="metric__hint">{hint}</div>}
      {bar !== undefined && (
        <div className="metric__track" aria-hidden="true">
          <div
            className={`metric__bar ${barClass ?? ""}`}
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </div>
      )}
    </div>
  );
}
