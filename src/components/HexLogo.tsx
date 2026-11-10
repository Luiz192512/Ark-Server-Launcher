interface Props {
  size?: number;
}

// Same emblem as design/icon.svg, without the glow, so the sidebar and the app icon match.
export function HexLogo({ size = 36 }: Props) {
  return (
    <svg
      className="hex-logo"
      aria-hidden="true"
      viewBox="0 0 1024 1024"
      width={size}
      height={size}
    >
      <defs>
        <linearGradient id="hexlogo-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#12303A" />
          <stop offset="1" stopColor="#060C0F" />
        </linearGradient>
        <linearGradient id="hexlogo-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8FF5EC" />
          <stop offset="0.55" stopColor="#2EE6D6" />
          <stop offset="1" stopColor="#1FA89C" />
        </linearGradient>
      </defs>
      <polygon
        points="512,42 919,277 919,747 512,982 105,747 105,277"
        fill="url(#hexlogo-fill)"
        stroke="url(#hexlogo-rim)"
        strokeWidth="34"
        strokeLinejoin="round"
      />
      <polyline
        points="300,742 512,262 724,742"
        fill="none"
        stroke="url(#hexlogo-rim)"
        strokeWidth="84"
        strokeMiterlimit="6"
      />
    </svg>
  );
}
