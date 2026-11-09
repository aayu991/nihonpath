export function JapanIllustration() {
  return (
    <svg
      viewBox="0 0 600 510"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="japan-illustration"
    >
      <defs>
        <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
          <path d="M36 0H0V36" stroke="#D5E1ED" strokeWidth=".65" />
        </pattern>
        <clipPath id="scene">
          <rect width="600" height="510" rx="24" />
        </clipPath>
      </defs>
      <g clipPath="url(#scene)">
        <rect width="600" height="510" fill="#EAF1F8" />
        <rect width="600" height="510" fill="url(#grid)" />
        <circle cx="389" cy="145" r="68" fill="#E8A19B" />
        <circle cx="389" cy="145" r="88" stroke="#E8A19B" strokeOpacity=".3" />
        <path d="M-40 351 225 127 492 360Z" fill="#A9BFD4" />
        <path d="m225 127-62 53 26-4 22 16 17-24 24 12 20-14Z" fill="#F8FAFC" />
        <path d="m210 194-47 114 60-30 43 48-30-147Z" fill="#8FAAC3" />
        <path
          d="M-40 384 127 273 224 356 395 266 650 400V530H-40Z"
          fill="#7896AE"
        />
        <path
          d="M-60 428 108 349 263 416 425 346 650 411V530H-60Z"
          fill="#45667E"
        />
        <path
          d="M0 452c156-28 184-10 299-1s202-35 301-19v78H0Z"
          fill="#24465F"
        />
        <path
          d="M398 510c-124-70-148-62-70-109-65 26-74 48-21 75l65 34Z"
          fill="#D4E2EC"
        />
        <g fill="#193A51">
          <path d="M68 313h10v161H68z" />
          <path d="m72 288-44 70h88ZM72 321l-53 72h106ZM72 355 9 431h127Z" />
          <path d="M532 312h8v160h-8z" />
          <path d="m536 279-34 64h68Zm0 38-43 71h86Zm0 43-51 72h102Z" />
        </g>
        <g stroke="#122F49" strokeWidth="9" strokeLinecap="round">
          <path d="M363 288v139m102-139v139M349 318h130" />
          <path d="M338 279c40 10 112 10 151 0" strokeWidth="14" />
          <path d="M342 299h143" strokeWidth="7" />
          <path d="M414 291v25" strokeWidth="6" />
        </g>
        <g fill="#F6FAFC">
          <path d="M95 139h59a14 14 0 0 0-14-14h-5a22 22 0 0 0-42 3 6 6 0 0 0 2 11Zm333 79h91a16 16 0 0 0-18-16 26 26 0 0 0-48-3 15 15 0 0 0-25 19Z" />
        </g>
        <g stroke="#23465F" strokeWidth="2" strokeLinecap="round">
          <path d="m459 97 8 4 8-4m-31 15 6 3 6-3" />
        </g>
        <text
          x="37"
          y="53"
          fill="#45667E"
          fontSize="11"
          fontFamily="sans-serif"
          letterSpacing="3"
        >
          35.3606° N · 138.7274° E
        </text>
        <text
          x="40"
          y="486"
          fill="#EAF1F8"
          fontSize="12"
          fontFamily="sans-serif"
          letterSpacing="4"
        >
          JAPAN, A LITTLE CLOSER.
        </text>
        <g transform="translate(548 46)" stroke="#45667E">
          <circle r="14" />
          <path d="M0-9V9M-9 0H9" />
        </g>
      </g>
    </svg>
  );
}
