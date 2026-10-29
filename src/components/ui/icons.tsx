import { useId, type SVGProps } from "react";

const names = [
  "board",
  "hours",
  "invoices",
  "directory",
  "settings",
  "logout",
  "timer",
  "show",
  "hide",
  "login",
  "loading",
] as const;

export type IconName = (typeof names)[number];

export type EchoIconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  title?: string;
};

export function EchoIcon({
  name,
  size = 20,
  title,
  ...props
}: EchoIconProps) {
  const id = useId();
  const titleId = title ? `${id}-${name}-title` : undefined;

  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={titleId}
      focusable="false"
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {name === "board" ? (
        <>
<defs>
    <filter id={`${id}-board-shadow`} x="10" y="96" width="108" height="30" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <linearGradient id={`${id}-board-side`} x1="96" y1="26" x2="108" y2="104" gradientUnits="userSpaceOnUse">
      <stop stopColor="#466c4c"/>
      <stop offset="0.5" stopColor="#314e36"/>
      <stop offset="1" stopColor="#233a28"/>
    </linearGradient>
    <linearGradient id={`${id}-board-bottom`} x1="28" y1="98" x2="106" y2="106" gradientUnits="userSpaceOnUse">
      <stop stopColor="#314e36"/>
      <stop offset="1" stopColor="#1f3424"/>
    </linearGradient>
    <linearGradient id={`${id}-board-bevel`} x1="24" y1="20" x2="100" y2="98" gradientUnits="userSpaceOnUse">
      <stop stopColor="#e2f0df"/>
      <stop offset="0.25" stopColor="#bad6be"/>
      <stop offset="0.7" stopColor="#8bb08f"/>
      <stop offset="1" stopColor="#608665"/>
    </linearGradient>
    <linearGradient id={`${id}-board-face`} x1="28" y1="28" x2="96" y2="96" gradientUnits="userSpaceOnUse">
      <stop stopColor="#7a9f7e"/>
      <stop offset="0.5" stopColor="#678d6b"/>
      <stop offset="1" stopColor="#517555"/>
    </linearGradient>
    <linearGradient id={`${id}-board-card-face`} x1="0" y1="0" x2="0" y2="1">
      <stop stopColor="#ffffff"/>
      <stop offset="0.6" stopColor="#f4f8f2"/>
      <stop offset="1" stopColor="#e3ece1"/>
    </linearGradient>
    <linearGradient id={`${id}-board-clip`} x1="50" y1="14" x2="78" y2="28" gradientUnits="userSpaceOnUse">
      <stop stopColor="#eef6ec"/>
      <stop offset="0.4" stopColor="#cbe0cc"/>
      <stop offset="1" stopColor="#86aa89"/>
    </linearGradient>
  </defs>

  <g id={`${id}-board-ground`}>
    <ellipse cx="64" cy="110" rx="44" ry="7" fill="#1b2e1f" opacity="0.16" filter={`url(#${id}-board-shadow)`}/>
  </g>

  <g id={`${id}-board-body`}>
    {/*  Right side extrusion  */}
    <path d="M98 27 L105 32 Q106 33 106 35 L106 100 Q106 103 103 103 L98 99 Z" fill={`url(#${id}-board-side)`}/>
    {/*  Bottom thickness  */}
    <path d="M29 99 L34 103 Q36 104 38 104 L103 104 L98 99 Z" fill={`url(#${id}-board-bottom)`}/>
    {/*  Outer board bevel  */}
    <rect x="23" y="21" width="75" height="78" rx="8" fill={`url(#${id}-board-bevel)`}/>
    {/*  Recessed board face  */}
    <rect x="26" y="24" width="69" height="72" rx="6" fill={`url(#${id}-board-face)`}/>
    {/*  Column recessed channels  */}
    <rect x="29" y="32" width="19" height="60" rx="3" fill="#446647" opacity="0.45"/>
    <rect x="51" y="32" width="19" height="60" rx="3" fill="#446647" opacity="0.45"/>
    <rect x="73" y="32" width="19" height="60" rx="3" fill="#446647" opacity="0.45"/>
  </g>

  <g id={`${id}-board-cards`}>
    {/*  Column 1: Card 1  */}
    <rect x="31" y="36" width="15" height="22" rx="2.5" fill="#2d4831" opacity="0.25" transform="translate(0, 1.5)"/>
    <rect x="31" y="36" width="15" height="22" rx="2.5" fill={`url(#${id}-board-card-face)`}/>
    <rect x="33.5" y="40" width="10" height="2" rx="1" fill="#759978"/>
    <rect x="33.5" y="44" width="7" height="2" rx="1" fill="#a4c2a7"/>

    {/*  Column 1: Card 2  */}
    <rect x="31" y="63" width="15" height="18" rx="2.5" fill="#2d4831" opacity="0.25" transform="translate(0, 1.5)"/>
    <rect x="31" y="63" width="15" height="18" rx="2.5" fill={`url(#${id}-board-card-face)`}/>
    <rect x="33.5" y="67" width="9" height="2" rx="1" fill="#759978"/>

    {/*  Column 2: Card (Active / In Progress)  */}
    <rect x="53" y="36" width="15" height="28" rx="2.5" fill="#2d4831" opacity="0.25" transform="translate(0, 1.5)"/>
    <rect x="53" y="36" width="15" height="28" rx="2.5" fill={`url(#${id}-board-card-face)`}/>
    <rect x="55.5" y="40" width="10" height="2.5" rx="1" fill="#365b3e"/>
    <rect x="55.5" y="45" width="8" height="2" rx="1" fill="#759978"/>
    <rect x="55.5" y="49" width="6" height="2" rx="1" fill="#a4c2a7"/>
    <rect x="55.5" y="55" width="4" height="4" rx="2" fill="#58855e"/>

    {/*  Column 3: Card 1 (Done)  */}
    <rect x="75" y="36" width="15" height="16" rx="2.5" fill="#2d4831" opacity="0.25" transform="translate(0, 1.5)"/>
    <rect x="75" y="36" width="15" height="16" rx="2.5" fill={`url(#${id}-board-card-face)`}/>
    <rect x="77.5" y="40" width="8" height="2" rx="1" fill="#759978"/>
    <path d="M78 46 L80 48 L86 42" stroke="#365b3e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

    {/*  Column 3: Card 2  */}
    <rect x="75" y="57" width="15" height="20" rx="2.5" fill="#2d4831" opacity="0.25" transform="translate(0, 1.5)"/>
    <rect x="75" y="57" width="15" height="20" rx="2.5" fill={`url(#${id}-board-card-face)`}/>
    <rect x="77.5" y="61" width="10" height="2" rx="1" fill="#759978"/>
    <rect x="77.5" y="65" width="6" height="2" rx="1" fill="#a4c2a7"/>
  </g>

  {/*  Top Clamp Clip  */}
  <g id={`${id}-board-clip-group`}>
    <rect x="49" y="16" width="23" height="8" rx="3" fill="#203624" opacity="0.3" transform="translate(0, 1.5)"/>
    <rect x="49" y="16" width="23" height="8" rx="3" fill={`url(#${id}-board-clip)`}/>
    <rect x="53" y="18" width="15" height="4" rx="2" fill="#517555"/>
  </g>
        </>
      ) : name === "hours" ? (
        <>
<defs>
    <filter id={`${id}-hours-shadow`} x="14" y="98" width="100" height="28" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
    <linearGradient id={`${id}-hours-cap-top`} x1="36" y1="16" x2="92" y2="28" gradientUnits="userSpaceOnUse">
      <stop stopColor="#e8f3e6"/>
      <stop offset="0.45" stopColor="#badaba"/>
      <stop offset="1" stopColor="#7ea683"/>
    </linearGradient>
    <linearGradient id={`${id}-hours-cap-rim`} x1="32" y1="24" x2="96" y2="34" gradientUnits="userSpaceOnUse">
      <stop stopColor="#557c59"/>
      <stop offset="0.7" stopColor="#36583d"/>
      <stop offset="1" stopColor="#223a27"/>
    </linearGradient>
    <linearGradient id={`${id}-hours-base-top`} x1="36" y1="96" x2="92" y2="106" gradientUnits="userSpaceOnUse">
      <stop stopColor="#9fc2a2"/>
      <stop offset="0.5" stopColor="#739a76"/>
      <stop offset="1" stopColor="#4d7251"/>
    </linearGradient>
    <linearGradient id={`${id}-hours-base-rim`} x1="32" y1="102" x2="96" y2="112" gradientUnits="userSpaceOnUse">
      <stop stopColor="#446949"/>
      <stop offset="0.7" stopColor="#2a472f"/>
      <stop offset="1" stopColor="#1b3020"/>
    </linearGradient>
    <linearGradient id={`${id}-hours-pillar-left`} x1="34" y1="28" x2="42" y2="98" gradientUnits="userSpaceOnUse">
      <stop stopColor="#d4e8d3"/>
      <stop offset="0.3" stopColor="#88ad8a"/>
      <stop offset="1" stopColor="#426647"/>
    </linearGradient>
    <linearGradient id={`${id}-hours-pillar-right`} x1="86" y1="28" x2="94" y2="98" gradientUnits="userSpaceOnUse">
      <stop stopColor="#a8c8aa"/>
      <stop offset="0.5" stopColor="#557a59"/>
      <stop offset="1" stopColor="#2f4e34"/>
    </linearGradient>
    <linearGradient id={`${id}-hours-glass`} x1="42" y1="34" x2="86" y2="94" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ffffff" stopOpacity="0.7"/>
      <stop offset="0.3" stopColor="#d9eed8" stopOpacity="0.4"/>
      <stop offset="0.7" stopColor="#a4cca3" stopOpacity="0.3"/>
      <stop offset="1" stopColor="#548256" stopOpacity="0.5"/>
    </linearGradient>
    <linearGradient id={`${id}-hours-sand`} x1="48" y1="68" x2="80" y2="96" gradientUnits="userSpaceOnUse">
      <stop stopColor="#608d65"/>
      <stop offset="0.6" stopColor="#426b47"/>
      <stop offset="1" stopColor="#28482d"/>
    </linearGradient>
  </defs>

  <g id={`${id}-hours-ground`}>
    <ellipse cx="64" cy="110" rx="38" ry="7" fill="#1b2e1f" opacity="0.16" filter={`url(#${id}-hours-shadow)`}/>
  </g>

  <g id={`${id}-hours-body`}>
    {/*  Bottom Base Plate  */}
    <path d="M34 102 C34 97 47 94 64 94 C81 94 94 97 94 102 L94 106 C94 111 81 114 64 114 C47 114 34 111 34 106 Z" fill={`url(#${id}-hours-base-rim)`}/>
    <ellipse cx="64" cy="102" rx="30" ry="8" fill={`url(#${id}-hours-base-top)`}/>

    {/*  Glass Vessel Body  */}
    <path d="M44 32 C44 48 57 56 61 64 C57 72 44 80 44 96 C44 98 48 100 64 100 C80 100 84 98 84 96 C84 80 71 72 67 64 C71 56 84 48 84 32 C84 30 80 28 64 28 C48 28 44 30 44 32 Z" fill={`url(#${id}-hours-glass)`}/>

    {/*  Sand inside bulbs  */}
    {/*  Top bulb draining sand  */}
    <path d="M48 36 C52 46 60 52 64 56 C68 52 76 46 80 36 C74 38 54 38 48 36 Z" fill="#69946e" opacity="0.85"/>
    {/*  Trickling stream  */}
    <path d="M63 56 L65 56 L64.5 76 L63.5 76 Z" fill="#3d6342"/>
    {/*  Bottom bulb accumulated sand mound  */}
    <path d="M47 96 C48 86 56 76 64 76 C72 76 80 86 81 96 C74 98 54 98 47 96 Z" fill={`url(#${id}-hours-sand)`}/>

    {/*  Glass specular highlight curve  */}
    <path d="M47 36 C47 48 56 55 59 62 C57 55 49 48 49 36 Z" fill="#ffffff" opacity="0.6"/>
    <path d="M47 92 C47 84 55 77 59 70 C57 76 49 83 49 92 Z" fill="#ffffff" opacity="0.5"/>

    {/*  Pillars  */}
    {/*  Left Pillar  */}
    <rect x="35" y="26" width="6.5" height="78" rx="3.25" fill={`url(#${id}-hours-pillar-left)`}/>
    {/*  Right Pillar  */}
    <rect x="86.5" y="26" width="6.5" height="78" rx="3.25" fill={`url(#${id}-hours-pillar-right)`}/>

    {/*  Top Cap Plate  */}
    <path d="M34 24 C34 29 47 32 64 32 C81 32 94 29 94 24 L94 20 C94 15 81 12 64 12 C47 12 34 15 34 20 Z" fill={`url(#${id}-hours-cap-rim)`}/>
    <ellipse cx="64" cy="20" rx="30" ry="8" fill={`url(#${id}-hours-cap-top)`}/>

    {/*  Top decorative finial button  */}
    <ellipse cx="64" cy="18" rx="7" ry="2.5" fill="#badaba"/>
    <circle cx="64" cy="16" r="3" fill="#e8f3e6"/>
  </g>
        </>
      ) : name === "invoices" ? (
        <>
<defs>
    <filter id={`${id}-invoices-shadow`} x="16" y="98" width="98" height="28" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <linearGradient id={`${id}-inv-side`} x1="90" y1="24" x2="102" y2="104" gradientUnits="userSpaceOnUse">
      <stop stopColor="#4a7350"/>
      <stop offset="0.6" stopColor="#345439"/>
      <stop offset="1" stopColor="#243c29"/>
    </linearGradient>
    <linearGradient id={`${id}-inv-bottom`} x1="32" y1="98" x2="100" y2="106" gradientUnits="userSpaceOnUse">
      <stop stopColor="#345439"/>
      <stop offset="1" stopColor="#213825"/>
    </linearGradient>
    <linearGradient id={`${id}-inv-sheet`} x1="32" y1="18" x2="92" y2="102" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ffffff"/>
      <stop offset="0.4" stopColor="#f6faf4"/>
      <stop offset="0.8" stopColor="#e8f2e6"/>
      <stop offset="1" stopColor="#d4e4d2"/>
    </linearGradient>
    <linearGradient id={`${id}-inv-fold-face`} x1="72" y1="18" x2="94" y2="40" gradientUnits="userSpaceOnUse">
      <stop stopColor="#c4e2c4"/>
      <stop offset="0.5" stopColor="#8eb890"/>
      <stop offset="1" stopColor="#5b8660"/>
    </linearGradient>
    <linearGradient id={`${id}-inv-seal`} x1="40" y1="32" x2="56" y2="48" gradientUnits="userSpaceOnUse">
      <stop stopColor="#608d66"/>
      <stop offset="1" stopColor="#345939"/>
    </linearGradient>
  </defs>

  <g id={`${id}-invoices-ground`}>
    <ellipse cx="65" cy="110" rx="40" ry="7" fill="#1b2e1f" opacity="0.16" filter={`url(#${id}-invoices-shadow)`}/>
  </g>

  <g id={`${id}-invoices-body`}>
    {/*  Right side thickness  */}
    <path d="M92 40 L97 44 Q98 45 98 47 L98 100 Q98 103 95 103 L92 99 Z" fill={`url(#${id}-inv-side)`}/>
    {/*  Bottom thickness  */}
    <path d="M33 99 L38 103 Q40 104 42 104 L95 104 L92 99 Z" fill={`url(#${id}-inv-bottom)`}/>

    {/*  Main Sheet with cut top-right corner  */}
    <path d="M33 18 L72 18 L92 38 L92 99 Q92 101 90 101 L33 101 Q31 101 31 99 L31 20 Q31 18 33 18 Z" fill={`url(#${id}-inv-sheet)`}/>

    {/*  Cast shadow beneath the corner fold  */}
    <path d="M72 18 L92 38 L72 38 Z" fill="#26402b" opacity="0.22" transform="translate(1.5, 2.5)"/>

    {/*  Folded corner flap (3D inverted triangle)  */}
    <path d="M72 18 L92 38 L72 38 Z" fill={`url(#${id}-inv-fold-face)`}/>
    <path d="M72 38 L92 38 L94 40 L72 40 Z" fill="#3e6344"/>

    {/*  Embossed Seal / Stamp in upper left  */}
    <ellipse cx="48" cy="38" rx="9" ry="9" fill="#243f29" opacity="0.2" transform="translate(0, 1.5)"/>
    <ellipse cx="48" cy="38" rx="9" ry="9" fill={`url(#${id}-inv-seal)`}/>
    <circle cx="48" cy="38" r="6" fill="#8cb390" stroke="#f6faf4" strokeWidth="1.2"/>
    {/*  Currency / Check symbol in seal  */}
    <path d="M45.5 38.5 L47.5 40.5 L51.5 35.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

    {/*  Invoice item rows (tactile grooved bars)  */}
    <rect x="38" y="54" width="34" height="4" rx="2" fill="#759978"/>
    <rect x="76" y="54" width="12" height="4" rx="2" fill="#466d4a"/>

    <rect x="38" y="64" width="28" height="3.5" rx="1.75" fill="#9dbda0"/>
    <rect x="76" y="64" width="12" height="3.5" rx="1.75" fill="#58805c"/>

    <rect x="38" y="73" width="32" height="3.5" rx="1.75" fill="#9dbda0"/>
    <rect x="76" y="73" width="12" height="3.5" rx="1.75" fill="#58805c"/>

    {/*  Divider rule  */}
    <line x1="38" y1="83" x2="88" y2="83" stroke="#b2ceb4" strokeWidth="1.5" strokeLinecap="round"/>

    {/*  Total Highlight Row  */}
    <rect x="38" y="88" width="20" height="4.5" rx="2" fill="#58805c"/>
    <rect x="68" y="87" width="20" height="6.5" rx="2.5" fill="#365b3e"/>
  </g>
        </>
      ) : name === "directory" ? (
        <>
<defs>
    <filter id={`${id}-directory-shadow`} x="12" y="96" width="104" height="30" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <linearGradient id={`${id}-dir-box-front`} x1="22" y1="56" x2="106" y2="104" gradientUnits="userSpaceOnUse">
      <stop stopColor="#739a77"/>
      <stop offset="0.6" stopColor="#557a58"/>
      <stop offset="1" stopColor="#3b5e3f"/>
    </linearGradient>
    <linearGradient id={`${id}-dir-box-side`} x1="104" y1="56" x2="114" y2="106" gradientUnits="userSpaceOnUse">
      <stop stopColor="#3c5f40"/>
      <stop offset="1" stopColor="#243d27"/>
    </linearGradient>
    <linearGradient id={`${id}-dir-box-rim`} x1="22" y1="54" x2="106" y2="60" gradientUnits="userSpaceOnUse">
      <stop stopColor="#d4ead3"/>
      <stop offset="0.5" stopColor="#9fc2a2"/>
      <stop offset="1" stopColor="#608663"/>
    </linearGradient>
    <linearGradient id={`${id}-dir-card-1`} x1="28" y1="22" x2="100" y2="58" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ffffff"/>
      <stop offset="1" stopColor="#dbe8d8"/>
    </linearGradient>
    <linearGradient id={`${id}-dir-card-2`} x1="28" y1="30" x2="100" y2="64" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ffffff"/>
      <stop offset="1" stopColor="#eaf3e8"/>
    </linearGradient>
    <linearGradient id={`${id}-dir-label-plate`} x1="48" y1="72" x2="80" y2="88" gradientUnits="userSpaceOnUse">
      <stop stopColor="#eef6ec"/>
      <stop offset="0.6" stopColor="#c5dec4"/>
      <stop offset="1" stopColor="#84aa86"/>
    </linearGradient>
  </defs>

  <g id={`${id}-directory-ground`}>
    <ellipse cx="64" cy="110" rx="44" ry="7" fill="#1b2e1f" opacity="0.16" filter={`url(#${id}-directory-shadow)`}/>
  </g>

  <g id={`${id}-directory-body`}>
    {/*  Back interior of tray  */}
    <rect x="24" y="44" width="80" height="40" rx="5" fill="#2d4931"/>

    {/*  Index Card 1 (Rear, Left Tab)  */}
    <path d="M28 28 Q28 24 32 24 L52 24 Q56 24 58 28 L60 32 L98 32 Q100 32 100 34 L100 64 L28 64 Z" fill={`url(#${id}-dir-card-1)`}/>
    <rect x="32" y="27" width="16" height="3" rx="1.5" fill="#58805c"/>

    {/*  Index Card 2 (Middle, Center Tab)  */}
    <path d="M28 36 L52 36 L54 32 Q56 30 60 30 L76 30 Q80 30 82 34 L84 36 L98 36 Q100 36 100 38 L100 68 L28 68 Z" fill={`url(#${id}-dir-card-2)`}/>
    <rect x="60" y="33" width="14" height="3" rx="1.5" fill="#446b48"/>

    {/*  Index Card 3 (Front, Right Tab)  */}
    <path d="M28 42 L74 42 L76 38 Q78 36 82 36 L96 36 Q100 36 100 40 L100 74 L28 74 Z" fill="#f8fcf7"/>
    <rect x="80" y="39" width="14" height="3" rx="1.5" fill="#365b3e"/>

    {/*  Box Right Flank  */}
    <path d="M104 56 L111 60 Q112 61 112 63 L112 99 Q112 102 109 102 L104 98 Z" fill={`url(#${id}-dir-box-side)`}/>

    {/*  Box Front Face  */}
    <rect x="20" y="56" width="84" height="44" rx="6" fill={`url(#${id}-dir-box-front)`}/>
    {/*  Top Rim Highlight  */}
    <rect x="20" y="55" width="84" height="3.5" rx="1.75" fill={`url(#${id}-dir-box-rim)`}/>

    {/*  Metal Label Pull / Nameplate on front  */}
    <rect x="44" y="70" width="36" height="18" rx="4" fill="#263e2a" opacity="0.3" transform="translate(0, 1.5)"/>
    <rect x="44" y="70" width="36" height="18" rx="4" fill={`url(#${id}-dir-label-plate)`}/>
    {/*  Inner label paper  */}
    <rect x="48" y="73" width="28" height="12" rx="2.5" fill="#ffffff"/>
    <line x1="52" y1="79" x2="72" y2="79" stroke="#4a7350" strokeWidth="2" strokeLinecap="round"/>
  </g>
        </>
      ) : name === "settings" ? (
        <>
<defs>
    <filter id={`${id}-settings-shadow`} x="12" y="86" width="104" height="38" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <linearGradient id={`${id}-set-main-face`} x1="26" y1="42" x2="84" y2="102" gradientUnits="userSpaceOnUse">
      <stop stopColor="#b6d7b8"/>
      <stop offset="0.35" stopColor="#8bb08e"/>
      <stop offset="0.75" stopColor="#608663"/>
      <stop offset="1" stopColor="#3f6343"/>
    </linearGradient>
    <linearGradient id={`${id}-set-main-bevel`} x1="24" y1="38" x2="86" y2="104" gradientUnits="userSpaceOnUse">
      <stop stopColor="#edf6ec"/>
      <stop offset="0.4" stopColor="#bad6bc"/>
      <stop offset="1" stopColor="#466d49"/>
    </linearGradient>
    <linearGradient id={`${id}-set-sec-face`} x1="72" y1="20" x2="110" y2="60" gradientUnits="userSpaceOnUse">
      <stop stopColor="#d4ead2"/>
      <stop offset="0.5" stopColor="#95bb98"/>
      <stop offset="1" stopColor="#557a58"/>
    </linearGradient>
    <linearGradient id={`${id}-set-hub-recess`} x1="42" y1="58" x2="68" y2="86" gradientUnits="userSpaceOnUse">
      <stop stopColor="#2a452e"/>
      <stop offset="0.6" stopColor="#466d4a"/>
      <stop offset="1" stopColor="#729a75"/>
    </linearGradient>
  </defs>

  <g id={`${id}-settings-ground`}>
    <ellipse cx="56" cy="108" rx="36" ry="6" fill="#1b2e1f" opacity="0.16" filter={`url(#${id}-settings-shadow)`}/>
    <ellipse cx="90" cy="68" rx="18" ry="4" fill="#1b2e1f" opacity="0.12" filter={`url(#${id}-settings-shadow)`}/>
  </g>

  <g id={`${id}-settings-body`}>
    {/*  Secondary Gear (Upper-Right)  */}
    {/*  6 teeth + body for secondary gear centered at (90, 42) r=22  */}
    <path d="M86 20 L94 20 L96 26 L102 29 L107 24 L112 29 L109 35 L112 40 L118 42 L118 50 L112 52 L109 57 L112 63 L107 68 L102 63 L96 66 L94 72 L86 72 L84 66 L78 63 L73 68 L68 63 L71 57 L68 52 L62 50 L62 42 L68 40 L71 35 L68 29 L73 24 L78 29 L84 26 Z" fill={`url(#${id}-set-sec-face)`}/>
    <circle cx="90" cy="46" r="8" fill="#325036"/>
    <circle cx="90" cy="46" r="4.5" fill="#f4f8f2"/>

    {/*  Main Primary Gear Flank Thickness  */}
    {/*  Centered at (55, 72)  */}
    <path d="M50 36 L60 36 L62 44 L70 47 L77 41 L84 48 L80 56 L86 63 L94 65 L94 77 L86 79 L80 86 L84 94 L77 101 L70 95 L62 98 L60 106 L50 106 L48 98 L40 95 L33 101 L26 94 L30 86 L24 79 L16 77 L16 65 L24 63 L30 56 L26 48 L33 41 L40 47 L48 44 Z" fill="#243c27" transform="translate(2, 4)"/>

    {/*  Main Gear Face with 8 sculpted teeth  */}
    <path d="M50 36 L60 36 L62 44 L70 47 L77 41 L84 48 L80 56 L86 63 L94 65 L94 77 L86 79 L80 86 L84 94 L77 101 L70 95 L62 98 L60 106 L50 106 L48 98 L40 95 L33 101 L26 94 L30 86 L24 79 L16 77 L16 65 L24 63 L30 56 L26 48 L33 41 L40 47 L48 44 Z" fill={`url(#${id}-set-main-face)`}/>

    {/*  Bevel perimeter highlight line  */}
    <path d="M50 36 L60 36 L62 44 L70 47 L77 41 L84 48 M86 63 L94 65 M50 36 L48 44 L40 47 L33 41 L26 48" stroke="#edf6ec" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.75"/>

    {/*  Main Gear Recessed Hub Depression  */}
    <circle cx="55" cy="71" r="19" fill={`url(#${id}-set-hub-recess)`}/>
    <circle cx="55" cy="71" r="19" fill="none" stroke="#243c27" strokeWidth="1.5" opacity="0.6"/>

    {/*  Raised center axle collar  */}
    <circle cx="55" cy="71" r="12" fill={`url(#${id}-set-main-bevel)`}/>
    {/*  Center axle bore hole  */}
    <circle cx="55" cy="71" r="6.5" fill="#1b2f1e"/>
    <circle cx="55" cy="72" r="5.5" fill="#122014"/>
    {/*  Inner bore bottom-right highlight  */}
    <path d="M51 74 A5.5 5.5 0 0 0 59 74" stroke="#a4c7a6" strokeWidth="1.2" fill="none"/>
  </g>
        </>
      ) : name === "logout" ? (
        <>
<defs>
    <filter id={`${id}-logout-shadow`} x="12" y="98" width="104" height="28" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <linearGradient id={`${id}-log-frame-top`} x1="22" y1="18" x2="82" y2="30" gradientUnits="userSpaceOnUse">
      <stop stopColor="#e8f4e6"/>
      <stop offset="0.5" stopColor="#bad8bc"/>
      <stop offset="1" stopColor="#739c76"/>
    </linearGradient>
    <linearGradient id={`${id}-log-frame-left`} x1="22" y1="24" x2="36" y2="104" gradientUnits="userSpaceOnUse">
      <stop stopColor="#9fc2a2"/>
      <stop offset="0.5" stopColor="#608864"/>
      <stop offset="1" stopColor="#3c5f40"/>
    </linearGradient>
    <linearGradient id={`${id}-log-frame-inner`} x1="32" y1="28" x2="72" y2="98" gradientUnits="userSpaceOnUse">
      <stop stopColor="#1b2f1f"/>
      <stop offset="0.7" stopColor="#2a452e"/>
      <stop offset="1" stopColor="#3c5e40"/>
    </linearGradient>
    <linearGradient id={`${id}-log-door`} x1="32" y1="28" x2="58" y2="100" gradientUnits="userSpaceOnUse">
      <stop stopColor="#bad6bc"/>
      <stop offset="0.4" stopColor="#78a17c"/>
      <stop offset="1" stopColor="#466d49"/>
    </linearGradient>
    <linearGradient id={`${id}-log-arrow`} x1="48" y1="52" x2="108" y2="76" gradientUnits="userSpaceOnUse">
      <stop stopColor="#f8fcf7"/>
      <stop offset="0.3" stopColor="#cde5cf"/>
      <stop offset="0.7" stopColor="#8cb58f"/>
      <stop offset="1" stopColor="#4c7350"/>
    </linearGradient>
  </defs>

  <g id={`${id}-logout-ground`}>
    <ellipse cx="64" cy="110" rx="42" ry="7" fill="#1b2e1f" opacity="0.16" filter={`url(#${id}-logout-shadow)`}/>
  </g>

  <g id={`${id}-logout-body`}>
    {/*  Portal Frame Outer & Inner Opening  */}
    {/*  Outer wall frame  */}
    <path d="M22 24 Q22 18 28 18 L76 18 Q82 18 82 24 L82 104 L22 104 Z" fill={`url(#${id}-log-frame-left)`}/>
    {/*  Top lintel bevel  */}
    <path d="M22 24 Q22 18 28 18 L76 18 Q82 18 82 24 L74 30 L30 30 Z" fill={`url(#${id}-log-frame-top)`}/>
    {/*  Deep interior chamber behind door  */}
    <rect x="32" y="30" width="42" height="74" rx="2" fill={`url(#${id}-log-frame-inner)`}/>
    {/*  Bottom threshold step  */}
    <path d="M20 102 L84 102 L86 106 L18 106 Z" fill="#bad8bc"/>
    <path d="M18 106 L86 106 L84 108 L20 108 Z" fill="#36583a"/>

    {/*  Open Door Leaf (Swung inward at perspective angle)  */}
    <path d="M32 30 L56 38 L56 102 L32 104 Z" fill={`url(#${id}-log-door)`}/>
    <path d="M32 30 L56 38 L58 40 L34 32 Z" fill="#e8f4e6" opacity="0.8"/>
    {/*  Recessed panels on open door  */}
    <path d="M36 42 L52 47 L52 64 L36 61 Z" fill="#38583c" opacity="0.4"/>
    <path d="M36 68 L52 71 L52 94 L36 96 Z" fill="#38583c" opacity="0.4"/>
    {/*  Door Handle  */}
    <ellipse cx="52" cy="70" rx="1.8" ry="3" fill="#edf5ec"/>

    {/*  3D Volumetric Outgoing Arrow  */}
    {/*  Arrow contact shadow  */}
    <path d="M50 67 L78 67 L78 57 L104 73 L78 89 L78 79 L50 79 Z" fill="#182c1c" opacity="0.25" transform="translate(0, 3)"/>
    {/*  Arrow under/side thickness  */}
    <path d="M50 67 L78 67 L78 57 L104 73 L78 89 L78 79 L50 79 Z" fill="#2d4930" transform="translate(1, 2)"/>
    {/*  Arrow front face  */}
    <path d="M50 65 L78 65 L78 55 L104 71 L78 87 L78 77 L50 77 Z" fill={`url(#${id}-log-arrow)`}/>
    {/*  Arrow top highlight edge  */}
    <path d="M50 65 L78 65 L78 55 L104 71" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.85"/>
  </g>
        </>
      ) : name === "timer" ? (
        <>
<defs>
    <filter id={`${id}-timer-shadow`} x="14" y="98" width="100" height="28" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <linearGradient id={`${id}-tim-casing`} x1="24" y1="28" x2="104" y2="108" gradientUnits="userSpaceOnUse">
      <stop stopColor="#e0f0dd"/>
      <stop offset="0.25" stopColor="#bad6bd"/>
      <stop offset="0.65" stopColor="#739a76"/>
      <stop offset="1" stopColor="#38583c"/>
    </linearGradient>
    <linearGradient id={`${id}-tim-casing-flank`} x1="88" y1="48" x2="108" y2="104" gradientUnits="userSpaceOnUse">
      <stop stopColor="#466b49"/>
      <stop offset="0.7" stopColor="#2a442e"/>
      <stop offset="1" stopColor="#1c3020"/>
    </linearGradient>
    <linearGradient id={`${id}-tim-dial`} x1="36" y1="38" x2="92" y2="94" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ffffff"/>
      <stop offset="0.5" stopColor="#f4f8f2"/>
      <stop offset="1" stopColor="#dce8da"/>
    </linearGradient>
    <linearGradient id={`${id}-tim-loop`} x1="46" y1="8" x2="82" y2="24" gradientUnits="userSpaceOnUse">
      <stop stopColor="#eaf4e8"/>
      <stop offset="0.5" stopColor="#9fc2a1"/>
      <stop offset="1" stopColor="#4c7350"/>
    </linearGradient>
  </defs>

  <g id={`${id}-timer-ground`}>
    <ellipse cx="64" cy="112" rx="40" ry="7" fill="#1b2e1f" opacity="0.16" filter={`url(#${id}-timer-shadow)`}/>
  </g>

  <g id={`${id}-timer-body`}>
    {/*  Top Plunger Button and Ring Loop  */}
    {/*  Wire ring loop  */}
    <path d="M48 20 C48 10 80 10 80 20" fill="none" stroke={`url(#${id}-tim-loop)`} strokeWidth="4.5" strokeLinecap="round"/>
    {/*  Top crown neck & button  */}
    <rect x="58" y="16" width="12" height="12" rx="2.5" fill="#2d4931" transform="translate(0, 1.5)"/>
    <rect x="58" y="16" width="12" height="12" rx="2.5" fill="#bad8bc"/>
    <rect x="56" y="14" width="16" height="5" rx="2.5" fill="#e8f4e6"/>

    {/*  Side Lap Pusher (at 2 o'clock, 45 deg)  */}
    <rect x="88" y="28" width="8" height="8" rx="2" fill="#587e5b" transform="rotate(35, 92, 32)"/>
    <rect x="91" y="27" width="8" height="4" rx="2" fill="#d8ecd6" transform="rotate(35, 92, 32)"/>

    {/*  Cylindrical Depth Flank on bottom-right  */}
    <circle cx="67" cy="71" r="39" fill={`url(#${id}-tim-casing-flank)`}/>

    {/*  Main Outer Bezel Casing  */}
    <circle cx="64" cy="68" r="39" fill={`url(#${id}-tim-casing)`}/>

    {/*  Inner Bezel Wall (Drop into dial)  */}
    <circle cx="64" cy="68" r="32" fill="#27402a"/>

    {/*  Dial Face  */}
    <circle cx="64" cy="68" r="29.5" fill={`url(#${id}-tim-dial)`}/>

    {/*  Inner top-left shadow ring inside dial for sunken depth  */}
    <path d="M38 52 A29.5 29.5 0 0 1 80 42" stroke="#2a452e" strokeWidth="3" fill="none" opacity="0.25"/>

    {/*  Tick Marks (12, 3, 6, 9 and 5-min intermediate)  */}
    {/*  12 o'clock  */}
    <rect x="62.75" y="41" width="2.5" height="5.5" rx="1.25" fill="#365b3e"/>
    {/*  3 o'clock  */}
    <rect x="87" y="66.75" width="5.5" height="2.5" rx="1.25" fill="#365b3e"/>
    {/*  6 o'clock  */}
    <rect x="62.75" y="87" width="2.5" height="5.5" rx="1.25" fill="#365b3e"/>
    {/*  9 o'clock  */}
    <rect x="41" y="66.75" width="5.5" height="2.5" rx="1.25" fill="#365b3e"/>

    {/*  Small intermediate ticks  */}
    <circle cx="78" cy="46" r="1.5" fill="#69916c"/>
    <circle cx="86" cy="54" r="1.5" fill="#69916c"/>
    <circle cx="86" cy="82" r="1.5" fill="#69916c"/>
    <circle cx="78" cy="90" r="1.5" fill="#69916c"/>
    <circle cx="50" cy="90" r="1.5" fill="#69916c"/>
    <circle cx="42" cy="82" r="1.5" fill="#69916c"/>
    <circle cx="42" cy="54" r="1.5" fill="#69916c"/>
    <circle cx="50" cy="46" r="1.5" fill="#69916c"/>

    {/*  Needle Hand pointing to 10 seconds (~58 degrees)  */}
    {/*  Hand cast shadow  */}
    <path d="M64 68 L81 50 L79 48 L62 66 Z" fill="#243d27" opacity="0.28" transform="translate(1, 1.5)"/>
    {/*  Hand needle  */}
    <path d="M64 68 L81 50 L79 48 L62 66 Z" fill="#315537"/>
    {/*  Hand tail / counterweight  */}
    <path d="M64 68 L57 74 L55 72 L62 66 Z" fill="#466d4a"/>

    {/*  Center Pivot Cap Button  */}
    <circle cx="64" cy="68" r="4.5" fill="#223a26"/>
    <circle cx="64" cy="67.5" r="3.5" fill="#dcefd9"/>
    <circle cx="63.5" cy="67" r="1.5" fill="#ffffff"/>
  </g>
        </>
      ) : name === "show" ? (
        <>
<defs>
    <filter id={`${id}-show-shadow`} x="12" y="86" width="104" height="32" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <linearGradient id={`${id}-show-upper-lid`} x1="20" y1="26" x2="108" y2="64" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ebf5e9"/>
      <stop offset="0.3" stopColor="#bad6bc"/>
      <stop offset="0.7" stopColor="#739d76"/>
      <stop offset="1" stopColor="#466d49"/>
    </linearGradient>
    <linearGradient id={`${id}-show-lower-lid`} x1="20" y1="64" x2="108" y2="100" gradientUnits="userSpaceOnUse">
      <stop stopColor="#739d76"/>
      <stop offset="0.6" stopColor="#4d7350"/>
      <stop offset="1" stopColor="#2d4930"/>
    </linearGradient>
    <linearGradient id={`${id}-show-sclera`} x1="30" y1="44" x2="98" y2="84" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ffffff"/>
      <stop offset="0.5" stopColor="#f2f7f0"/>
      <stop offset="1" stopColor="#cde0cb"/>
    </linearGradient>
    <radialGradient id={`${id}-show-iris`} cx="0.4" cy="0.35" r="0.65">
      <stop stopColor="#7eb082"/>
      <stop offset="0.45" stopColor="#4e7852"/>
      <stop offset="0.85" stopColor="#2a492e"/>
      <stop offset="1" stopColor="#182c1b"/>
    </radialGradient>
  </defs>

  <g id={`${id}-show-ground`}>
    <ellipse cx="64" cy="104" rx="42" ry="6" fill="#1b2e1f" opacity="0.15" filter={`url(#${id}-show-shadow)`}/>
  </g>

  <g id={`${id}-show-body`}>
    {/*  Lower Eyelid Bevel Base  */}
    <path d="M14 64 Q64 104 114 64 Q64 112 14 64 Z" fill={`url(#${id}-show-lower-lid)`}/>

    {/*  Almond Eye Opening / Sclera (Eyeball)  */}
    <path d="M16 64 Q64 24 112 64 Q64 104 16 64 Z" fill={`url(#${id}-show-sclera)`}/>

    {/*  Upper Lid Cast Shadow inside Sclera  */}
    <path d="M16 64 Q64 24 112 64 Q64 42 16 64 Z" fill="#243f28" opacity="0.28"/>

    {/*  Iris (Spherical green volume)  */}
    <circle cx="64" cy="64" r="22" fill={`url(#${id}-show-iris)`}/>
    {/*  Outer limbal ring border  */}
    <circle cx="64" cy="64" r="22" fill="none" stroke="#1c321e" strokeWidth="1.5" opacity="0.8"/>

    {/*  Deep Pupil  */}
    <circle cx="64" cy="64" r="10.5" fill="#101e12"/>

    {/*  Soft Matte Cornea Highlight (Upper-Left)  */}
    <ellipse cx="56" cy="55" rx="5.5" ry="4" fill="#ffffff" opacity="0.85"/>
    <circle cx="70" cy="71" r="2" fill="#ffffff" opacity="0.4"/>

    {/*  Upper Eyelid Sculpted Hood  */}
    <path d="M14 64 Q64 16 114 64 Q64 28 14 64 Z" fill={`url(#${id}-show-upper-lid)`}/>

    {/*  Delicate eyelid crease highlight line  */}
    <path d="M22 62 Q64 20 106 62" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.85"/>
  </g>
        </>
      ) : name === "hide" ? (
        <>
<defs>
    <filter id={`${id}-hide-shadow`} x="12" y="86" width="104" height="32" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <filter id={`${id}-hide-bar-shadow`} x="18" y="18" width="92" height="92" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="2.5"/>
    </filter>
    <linearGradient id={`${id}-hide-upper-lid`} x1="20" y1="26" x2="108" y2="64" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ebf5e9"/>
      <stop offset="0.3" stopColor="#bad6bc"/>
      <stop offset="0.7" stopColor="#739d76"/>
      <stop offset="1" stopColor="#466d49"/>
    </linearGradient>
    <linearGradient id={`${id}-hide-lower-lid`} x1="20" y1="64" x2="108" y2="100" gradientUnits="userSpaceOnUse">
      <stop stopColor="#739d76"/>
      <stop offset="0.6" stopColor="#4d7350"/>
      <stop offset="1" stopColor="#2d4930"/>
    </linearGradient>
    <linearGradient id={`${id}-hide-sclera`} x1="30" y1="44" x2="98" y2="84" gradientUnits="userSpaceOnUse">
      <stop stopColor="#f8fcf7"/>
      <stop offset="0.5" stopColor="#eaf1e8"/>
      <stop offset="1" stopColor="#c2d5c0"/>
    </linearGradient>
    <radialGradient id={`${id}-hide-iris`} cx="0.4" cy="0.35" r="0.65">
      <stop stopColor="#78a67c"/>
      <stop offset="0.45" stopColor="#49704d"/>
      <stop offset="0.85" stopColor="#27442a"/>
      <stop offset="1" stopColor="#162919"/>
    </radialGradient>
    <linearGradient id={`${id}-hide-bar-face`} x1="26" y1="24" x2="102" y2="104" gradientUnits="userSpaceOnUse">
      <stop stopColor="#eef6ec"/>
      <stop offset="0.25" stopColor="#bad8bc"/>
      <stop offset="0.6" stopColor="#7aa37d"/>
      <stop offset="1" stopColor="#3c6140"/>
    </linearGradient>
    <linearGradient id={`${id}-hide-bar-side`} x1="30" y1="28" x2="106" y2="106" gradientUnits="userSpaceOnUse">
      <stop stopColor="#446b47"/>
      <stop offset="1" stopColor="#1e3421"/>
    </linearGradient>
  </defs>

  <g id={`${id}-hide-ground`}>
    <ellipse cx="64" cy="104" rx="42" ry="6" fill="#1b2e1f" opacity="0.14" filter={`url(#${id}-hide-shadow)`}/>
  </g>

  {/*  Eye Body (identical to show, slightly muted)  */}
  <g id={`${id}-hide-body`} opacity="0.88">
    <path d="M14 64 Q64 104 114 64 Q64 112 14 64 Z" fill={`url(#${id}-hide-lower-lid)`}/>
    <path d="M16 64 Q64 24 112 64 Q64 104 16 64 Z" fill={`url(#${id}-hide-sclera)`}/>
    <path d="M16 64 Q64 24 112 64 Q64 42 16 64 Z" fill="#243f28" opacity="0.28"/>
    <circle cx="64" cy="64" r="22" fill={`url(#${id}-hide-iris)`}/>
    <circle cx="64" cy="64" r="10.5" fill="#101e12"/>
    <ellipse cx="56" cy="55" rx="5.5" ry="4" fill="#ffffff" opacity="0.8"/>
    <path d="M14 64 Q64 16 114 64 Q64 28 14 64 Z" fill={`url(#${id}-hide-upper-lid)`}/>
    <path d="M22 62 Q64 20 106 62" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.8"/>
  </g>

  {/*  Tactile 3D Diagonal Slash Bar hovering over the eye  */}
  <g id={`${id}-hide-slash-bar`}>
    {/*  Bar cast contact shadow on eye  */}
    <path d="M26 24 L102 100" stroke="#16291a" strokeWidth="13" strokeLinecap="round" opacity="0.38" filter={`url(#${id}-hide-bar-shadow)`}/>
    {/*  Bar under/side shaded flank  */}
    <path d="M27 26 L103 102" stroke={`url(#${id}-hide-bar-side)`} strokeWidth="11" strokeLinecap="round"/>
    {/*  Bar front face  */}
    <path d="M25 24 L101 100" stroke={`url(#${id}-hide-bar-face)`} strokeWidth="10.5" strokeLinecap="round"/>
    {/*  Bar top highlight ridge  */}
    <path d="M24 23 L99 98" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.85"/>
  </g>
        </>
      ) : name === "login" ? (
        <>
<defs>
    <filter id={`${id}-login-shadow`} x="18" y="86" width="96" height="38" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3.2"/>
    </filter>
    <linearGradient id={`${id}-key-face`} x1="24" y1="24" x2="104" y2="104" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ebf6ea"/>
      <stop offset="0.25" stopColor="#bad8bc"/>
      <stop offset="0.6" stopColor="#7aa37d"/>
      <stop offset="1" stopColor="#416645"/>
    </linearGradient>
    <linearGradient id={`${id}-key-side`} x1="30" y1="30" x2="108" y2="108" gradientUnits="userSpaceOnUse">
      <stop stopColor="#4c7350"/>
      <stop offset="0.6" stopColor="#2d4830"/>
      <stop offset="1" stopColor="#1b3020"/>
    </linearGradient>
    <linearGradient id={`${id}-key-hole-inner`} x1="36" y1="36" x2="52" y2="52" gradientUnits="userSpaceOnUse">
      <stop stopColor="#1b3020"/>
      <stop offset="0.5" stopColor="#3c5f40"/>
      <stop offset="1" stopColor="#bad8bc"/>
    </linearGradient>
  </defs>

  <g id={`${id}-login-ground`}>
    <ellipse cx="68" cy="106" rx="38" ry="6" fill="#1b2e1f" opacity="0.16" filter={`url(#${id}-login-shadow)`}/>
  </g>

  <g id={`${id}-login-body`}>
    {/*  Key Side Depth Extrusion (Bottom-Right)  */}
    {/*  Bow outer circle flank  */}
    <path d="M42 16 A26 26 0 0 1 68 42 L103 77 L103 87 L95 95 L95 91 L87 83 L81 89 L75 83 L57 65 A26 26 0 0 1 16 42 Z" fill={`url(#${id}-key-side)`} transform="translate(2, 3.5)"/>

    {/*  Key Front Solid Silhouette  */}
    {/*  Bow center at (42, 42) r=24. Shaft extends down-right to (101, 101) width=12  */}
    {/*  Teeth extend at (81, 81) to (95, 67)  */}
    <path d="M42 18 A24 24 0 0 0 18 42 A24 24 0 0 0 42 66 A24 24 0 0 0 54 62.8 L74 82.8 L74 92 Q74 94 76 94 L82 94 Q84 94 84 92 L84 86.8 L88 90.8 L88 98 Q88 100 90 100 L96 100 Q98 100 98 98 L98 90.8 L101.5 94.3 Q104.5 97.3 107.5 94.3 Q110.5 91.3 107.5 88.3 L62.8 43.6 A24 24 0 0 0 66 42 A24 24 0 0 0 42 18 Z" fill={`url(#${id}-key-face)`}/>

    {/*  Sculpted Bow Inner Hole (Revealing deep inner cylinder wall)  */}
    <circle cx="42" cy="42" r="10" fill={`url(#${id}-key-hole-inner)`}/>
    <circle cx="42" cy="42" r="8" fill="#152619"/>
    {/*  Bottom-right inner hole bevel highlight  */}
    <path d="M37 47 A8 8 0 0 0 49 47" stroke="#bad8bc" strokeWidth="1.8" fill="none"/>

    {/*  Key Shaft & Bow Top-Left Highlight Ridge  */}
    <path d="M26 30 A24 24 0 0 1 54 30 M58 48 L103 93" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85"/>
  </g>
        </>
      ) : name === "loading" ? (
        <>
<defs>
    <filter id={`${id}-loading-shadow`} x="12" y="88" width="104" height="34" filterUnits="userSpaceOnUse">
      <feGaussianBlur stdDeviation="3"/>
    </filter>
    <linearGradient id={`${id}-load-track`} x1="22" y1="22" x2="106" y2="106" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ffffff"/>
      <stop offset="0.25" stopColor="#bad8bc"/>
      <stop offset="0.6" stopColor="#69946d"/>
      <stop offset="0.88" stopColor="#3b5e40"/>
      <stop offset="1" stopColor="#243c28" stopOpacity="0.2"/>
    </linearGradient>
    <linearGradient id={`${id}-load-side`} x1="26" y1="26" x2="108" y2="108" gradientUnits="userSpaceOnUse">
      <stop stopColor="#7aa37d"/>
      <stop offset="0.7" stopColor="#385b3d"/>
      <stop offset="1" stopColor="#1c3020" stopOpacity="0.1"/>
    </linearGradient>
    <radialGradient id={`${id}-load-head`} cx="0.35" cy="0.3" r="0.7">
      <stop stopColor="#ffffff"/>
      <stop offset="0.45" stopColor="#badaba"/>
      <stop offset="0.85" stopColor="#557e59"/>
      <stop offset="1" stopColor="#2b4730"/>
    </radialGradient>
  </defs>

  {/*  Centered perfectly at (64, 64) for smooth 360 degree .spin rotation  */}
  <g id={`${id}-loading-body`}>
    {/*  Under/Side Shaded Toroid Layer  */}
    <path d="M64 24 A40 40 0 1 1 25.5 54" fill="none" stroke={`url(#${id}-load-side)`} strokeWidth="14" strokeLinecap="round" transform="translate(1, 2)"/>

    {/*  Main Volumetric Tubular Track (Spans ~285 degrees)  */}
    <path d="M64 24 A40 40 0 1 1 25.5 54" fill="none" stroke={`url(#${id}-load-track)`} strokeWidth="13" strokeLinecap="round"/>

    {/*  Inner tubular curvature highlight  */}
    <path d="M64 21 A40 40 0 0 1 104 64" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/>

    {/*  Volumetric Leading Orb / Head at (64, 24)  */}
    <circle cx="64" cy="24" r="7.5" fill={`url(#${id}-load-head)`}/>
    <circle cx="62" cy="22" r="2.5" fill="#ffffff" opacity="0.9"/>
  </g>
        </>
      ) : null}
    </svg>
  );
}
