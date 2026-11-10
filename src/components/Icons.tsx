import type { ReactNode } from "react";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const MapIcon = () => (
  <Svg>
    <path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z M9 4v14 M15 6v14" />
  </Svg>
);

export const PulseIcon = () => (
  <Svg>
    <path d="M3 12h4l3-7 4 14 3-7h4" />
  </Svg>
);

export const SlidersIcon = () => (
  <Svg>
    <path d="M4 7h9 M17 7h3 M4 17h3 M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
);

export const InfoIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6 M12 7.5v.01" />
  </Svg>
);
