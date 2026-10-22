import type { SVGProps } from "react";
const geometry = {
  quadro: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" fill="#d6e4cc" />
      <path d="M8.5 8v8m7-8v8M5.5 8v5M12 8v3M18.5 8v7" />
    </>
  ),
  horas: (
    <>
      <circle cx="12" cy="12" r="8.5" fill="#d6e4cc" />
      <path d="M12 6.5v6l4 2" />
    </>
  ),
  faturas: (
    <>
      <path d="M6 3.5h9l3 3v14l-3-1.5-3 1.5-3-1.5-3 1.5z" fill="#d6e4cc" />
      <path d="M9 8h5m-5 4h6m-6 4h4" />
    </>
  ),
  cadastros: (
    <>
      <path
        d="M3 8.5V6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        fill="#d6e4cc"
      />
      <path d="M3 10h18" />
    </>
  ),
  configuracoes: (
    <>
      <path
        d="m9 3-1 3-3 .5-1.5 3L5 12l-1.5 2.5 1.5 3 3 .5 1 3h6l1-3 3-.5 1.5-3L19 12l1.5-2.5-1.5-3-3-.5-1-3z"
        fill="#d6e4cc"
      />
      <circle cx="12" cy="12" r="3" fill="#fdfdf8" />
    </>
  ),
  sair: (
    <>
      <path d="M11 4H5v16h6" fill="#d6e4cc" />
      <path d="M10 12h11m-4-4 4 4-4 4" />
    </>
  ),
  cronometro: (
    <>
      <path d="M9 3h6m-3 0v3m5 1 2-2" />
      <circle cx="12" cy="14" r="7.5" fill="#d6e4cc" />
      <path d="M12 9v5l3 2" />
    </>
  ),
  mostrar: (
    <>
      <path d="M2.5 12Q12-2 21.5 12 12 26 2.5 12z" fill="#d6e4cc" />
      <circle cx="12" cy="12" r="3" fill="#fdfdf8" />
    </>
  ),
  ocultar: (
    <>
      <path d="M2.5 12Q12-2 21.5 12 12 26 2.5 12z" fill="#d6e4cc" />
      <path d="m4 3 16 18" />
    </>
  ),
  entrar: (
    <>
      <path d="M4 12h15m-6-6 6 6-6 6" />
    </>
  ),
  carregando: (
    <>
      <path d="M20 12a8 8 0 1 1-8-8" />
    </>
  ),
};
export type IconName = keyof typeof geometry;
export function EchoIcon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="#365b3e"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {geometry[name]}
    </svg>
  );
}
