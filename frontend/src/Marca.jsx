export function Marca({ tamanho = 40 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 48 48" role="img" aria-label="Verdona">
      <defs>
        <linearGradient id="gm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#52B862" />
          <stop offset="1" stopColor="#1E6B33" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#gm)" />
      <circle cx="24" cy="24" r="17.5" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.4" />
      <path d="M14 32c0-10 7-17 20-18-1 12-7 19-17 19-1 0-2 0-3-1z" fill="#fff" />
      <path d="M16 31c4-6 8-10 13-13" stroke="#2E7A3A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Moeda({ tamanho = 22 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#C07A3A" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
      <path d="M7 15.2c0-5 3.5-8.4 10-9-.5 6-3.5 9.4-8.5 9.4-.5 0-1 0-1.5-.4z" fill="#6B3A14" fillOpacity=".85" />
    </svg>
  );
}

/** Rota tracejada ao fundo, com um ponto percorrendo o caminho (a rota do coletor). */
export function RotaFundo({ parado }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path
        id="rota-caminho"
        d="M-40 740 C 180 620, 260 880, 470 760 S 760 500, 940 630 S 1240 820, 1500 540"
        fill="none"
        stroke="#2E7A3A"
        strokeOpacity=".18"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="2 16"
      />
      {!parado && (
        <circle r="7" fill="#2E7A3A" fillOpacity=".55">
          <animateMotion dur="28s" repeatCount="indefinite">
            <mpath href="#rota-caminho" />
          </animateMotion>
        </circle>
      )}
    </svg>
  );
}
