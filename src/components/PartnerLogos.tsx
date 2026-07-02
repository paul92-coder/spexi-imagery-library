export function NianticLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Niantic Spatial"
    >
      <path
        d="M0 16L8 4L16 16L8 28L0 16Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
      <text
        x="22"
        y="22"
        fill="currentColor"
        fontFamily="Inter, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        Niantic
      </text>
      <text
        x="82"
        y="22"
        fill="currentColor"
        fillOpacity="0.5"
        fontFamily="Inter, sans-serif"
        fontSize="15"
        fontWeight="400"
        letterSpacing="-0.01em"
      >
        Spatial
      </text>
    </svg>
  );
}

export function EsriLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Esri PartnerNet"
    >
      <circle cx="10" cy="16" r="8" fill="currentColor" fillOpacity="0.15" />
      <path
        d="M6 16C6 12.686 8.686 10 12 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="24"
        y="22"
        fill="currentColor"
        fontFamily="Inter, sans-serif"
        fontSize="16"
        fontWeight="800"
        letterSpacing="-0.03em"
      >
        Esri
      </text>
      <text
        x="62"
        y="22"
        fill="currentColor"
        fillOpacity="0.5"
        fontFamily="Inter, sans-serif"
        fontSize="13"
        fontWeight="500"
        letterSpacing="0.04em"
      >
        PARTNERNET
      </text>
    </svg>
  );
}

export function SkywatchLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Skywatch"
    >
      <path
        d="M2 20L8 12L14 20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2.5" fill="currentColor" />
      <text
        x="22"
        y="22"
        fill="currentColor"
        fontFamily="Inter, sans-serif"
        fontSize="16"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        Skywatch
      </text>
    </svg>
  );
}
