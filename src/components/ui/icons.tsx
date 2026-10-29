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
export function EchoIcon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  const id = useId();
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {name === "board" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-board-side`}
              x1="25"
              y1="36"
              x2="103"
              y2="105"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-board-face`} cx=".34" cy=".23" r=".78">
              <stop stopColor="#fffdf6" />
              <stop offset=".45" stopColor="#cfddc8" />
              <stop offset="1" stopColor="#739579" />
            </radialGradient>
            <linearGradient
              id={`${id}-board-rim`}
              x1="30"
              y1="22"
              x2="98"
              y2="101"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".5" stopColor="#91af8f" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M28 22H96Q103 22 103 30V96Q103 104 95 104H28Q20 104 20 96V30Q20 22 28 22Z"
            transform="translate(2 7)"
            fill={`url(#${id}-board-side)`}
          />
          <path
            d="M28 22H96Q103 22 103 30V96Q103 104 95 104H28Q20 104 20 96V30Q20 22 28 22Z"
            fill={`url(#${id}-board-face)`}
          />
          <path
            d="M42 41v43m21-43v25m21-25v35"
            stroke="#365b3e"
            strokeWidth="8"
            strokeLinecap="round"
          />
        </>
      ) : name === "hours" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-hours-side`}
              x1="25"
              y1="36"
              x2="103"
              y2="105"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-hours-face`} cx=".34" cy=".23" r=".78">
              <stop stopColor="#fffdf6" />
              <stop offset=".58" stopColor="#e7eee2" />
              <stop offset="1" stopColor="#a8bda7" />
            </radialGradient>
            <linearGradient
              id={`${id}-hours-rim`}
              x1="30"
              y1="22"
              x2="98"
              y2="101"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".5" stopColor="#91af8f" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M19 62C19 36 38 17 63 17c25 0 45 19 45 45v9c0 25-20 43-45 43S19 96 19 71Z"
            fill={`url(#${id}-hours-side)`}
          />
          <circle cx="63" cy="61" r="44" fill={`url(#${id}-hours-rim)`} />
          <circle cx="63" cy="61" r="36" fill={`url(#${id}-hours-face)`} />
          <path
            d="M63 35v27l18 10"
            fill="none"
            stroke="#365b3e"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="63" cy="62" r="5" fill="#365b3e" />
        </>
      ) : name === "invoices" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-invoices-side`}
              x1="25"
              y1="36"
              x2="103"
              y2="105"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient
              id={`${id}-invoices-face`}
              cx=".34"
              cy=".23"
              r=".78"
            >
              <stop stopColor="#fffdf6" />
              <stop offset=".45" stopColor="#cfddc8" />
              <stop offset="1" stopColor="#739579" />
            </radialGradient>
            <linearGradient
              id={`${id}-invoices-rim`}
              x1="30"
              y1="22"
              x2="98"
              y2="101"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".5" stopColor="#91af8f" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M33 17H79L98 36V108L85 101L73 108L61 101L49 108L33 101Z"
            transform="translate(2 7)"
            fill={`url(#${id}-invoices-side)`}
          />
          <path
            d="M33 17H79L98 36V108L85 101L73 108L61 101L49 108L33 101Z"
            fill={`url(#${id}-invoices-face)`}
          />
          <path
            d="M48 48H81M48 65H81M48 82H70"
            stroke="#54765b"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path d="M79 17V36H98Z" fill="#91af8f" />
        </>
      ) : name === "directory" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-directory-side`}
              x1="25"
              y1="30"
              x2="100"
              y2="108"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#91af8f" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-directory-face`} cx=".3" cy=".18" r=".9">
              <stop stopColor="#f0f5e9" />
              <stop offset=".5" stopColor="#bed1b4" />
              <stop offset="1" stopColor="#6e9474" />
            </radialGradient>
            <linearGradient
              id={`${id}-directory-rim`}
              x1="30"
              y1="25"
              x2="92"
              y2="104"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".4" stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M18 36Q18 27 27 27H47Q51 27 54 32L60 39H98Q107 39 107 48V94Q107 103 98 103H27Q18 103 18 94Z"
            fill={`url(#${id}-directory-side)`}
          />
          <path
            d="M20 35Q20 29 27 29H46Q49 29 52 33L59 42H98Q104 42 104 48V89H20Z"
            fill={`url(#${id}-directory-rim)`}
          />
          <path d="M29 48H95V87H29Z" fill="#e7eee2" />
          <path
            d="M24 55H105Q113 55 111 63L101 99Q99 107 91 107H25Q17 107 18 99L19 63Q19 55 24 55Z"
            fill={`url(#${id}-directory-side)`}
          />
          <path
            d="M24 53H104Q110 53 108 60L98 96Q97 102 90 102H26Q21 102 21 96L22 60Q22 53 24 53Z"
            fill={`url(#${id}-directory-face)`}
          />
        </>
      ) : name === "settings" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-settings-side`}
              x1="25"
              y1="30"
              x2="100"
              y2="108"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#91af8f" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-settings-face`} cx=".3" cy=".18" r=".9">
              <stop stopColor="#f0f5e9" />
              <stop offset=".5" stopColor="#bed1b4" />
              <stop offset="1" stopColor="#6e9474" />
            </radialGradient>
            <linearGradient
              id={`${id}-settings-rim`}
              x1="30"
              y1="25"
              x2="92"
              y2="104"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".4" stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M97.69 47.32L108.79 49.51L108.79 70.49L97.69 72.68L96.79 74.86L103.09 84.25L88.25 99.09L78.86 92.79L76.68 93.69L74.49 104.79L53.51 104.79L51.32 93.69L49.14 92.79L39.75 99.09L24.91 84.25L31.21 74.86L30.31 72.68L19.21 70.49L19.21 49.51L30.31 47.32L31.21 45.14L24.91 35.75L39.75 20.91L49.14 27.21L51.32 26.31L53.51 15.21L74.49 15.21L76.68 26.31L78.86 27.21L88.25 20.91L103.09 35.75L96.79 45.14Z"
            transform="translate(0 7)"
            fill={`url(#${id}-settings-side)`}
            stroke={`url(#${id}-settings-side)`}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            d="M97.69 47.32L108.79 49.51L108.79 70.49L97.69 72.68L96.79 74.86L103.09 84.25L88.25 99.09L78.86 92.79L76.68 93.69L74.49 104.79L53.51 104.79L51.32 93.69L49.14 92.79L39.75 99.09L24.91 84.25L31.21 74.86L30.31 72.68L19.21 70.49L19.21 49.51L30.31 47.32L31.21 45.14L24.91 35.75L39.75 20.91L49.14 27.21L51.32 26.31L53.51 15.21L74.49 15.21L76.68 26.31L78.86 27.21L88.25 20.91L103.09 35.75L96.79 45.14Z"
            fill={`url(#${id}-settings-face)`}
            stroke={`url(#${id}-settings-face)`}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <circle cx="64" cy="60" r="22" fill={`url(#${id}-settings-side)`} />
          <circle cx="64" cy="63" r="15" fill="#365b3e" />
          <path
            d="M49 63A15 15 0 0 1 79 63"
            fill="none"
            stroke="#54765b"
            strokeWidth="3"
          />
        </>
      ) : name === "logout" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-logout-side`}
              x1="25"
              y1="30"
              x2="100"
              y2="108"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#91af8f" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-logout-face`} cx=".3" cy=".18" r=".9">
              <stop stopColor="#f0f5e9" />
              <stop offset=".5" stopColor="#bed1b4" />
              <stop offset="1" stopColor="#6e9474" />
            </radialGradient>
            <linearGradient
              id={`${id}-logout-rim`}
              x1="30"
              y1="25"
              x2="92"
              y2="104"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".4" stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <rect
            x="23"
            y="22"
            width="49"
            height="88"
            rx="8"
            fill={`url(#${id}-logout-side)`}
          />
          <rect
            x="19"
            y="17"
            width="49"
            height="88"
            rx="8"
            fill={`url(#${id}-logout-rim)`}
          />
          <path
            d="M30 29Q30 26 34 27L56 32V94L34 98Q30 99 30 95Z"
            fill="#365b3e"
          />
          <path
            d="M53 60H88L77 49Q73 45 77 41Q81 37 85 41L106 62Q110 66 106 70L85 91Q81 95 77 91Q73 87 77 83L88 72H53Q47 72 47 66Q47 60 53 60Z"
            transform="translate(0 4)"
            fill={`url(#${id}-logout-side)`}
          />
          <path
            d="M53 56H88L77 45Q73 41 77 37Q81 33 85 37L106 58Q110 62 106 66L85 87Q81 91 77 87Q73 83 77 79L88 68H53Q47 68 47 62Q47 56 53 56Z"
            fill={`url(#${id}-logout-face)`}
          />
        </>
      ) : name === "timer" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-timer-side`}
              x1="25"
              y1="36"
              x2="103"
              y2="105"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-timer-face`} cx=".34" cy=".23" r=".78">
              <stop stopColor="#fffdf6" />
              <stop offset=".58" stopColor="#e7eee2" />
              <stop offset="1" stopColor="#a8bda7" />
            </radialGradient>
            <linearGradient
              id={`${id}-timer-rim`}
              x1="30"
              y1="22"
              x2="98"
              y2="101"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".5" stopColor="#91af8f" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M53 10H74M63 10V20"
            stroke="#54765b"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M19 62C19 36 38 17 63 17c25 0 45 19 45 45v9c0 25-20 43-45 43S19 96 19 71Z"
            fill={`url(#${id}-timer-side)`}
          />
          <circle cx="63" cy="61" r="44" fill={`url(#${id}-timer-rim)`} />
          <circle cx="63" cy="61" r="36" fill={`url(#${id}-timer-face)`} />
          <path
            d="M63 35v27l18 10"
            fill="none"
            stroke="#365b3e"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="63" cy="62" r="5" fill="#365b3e" />
        </>
      ) : name === "show" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-show-side`}
              x1="25"
              y1="36"
              x2="103"
              y2="105"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-show-face`} cx=".34" cy=".23" r=".78">
              <stop stopColor="#fffdf6" />
              <stop offset=".45" stopColor="#cfddc8" />
              <stop offset="1" stopColor="#739579" />
            </radialGradient>
            <linearGradient
              id={`${id}-show-rim`}
              x1="30"
              y1="22"
              x2="98"
              y2="101"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".5" stopColor="#91af8f" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M13 64Q61 1 111 64Q62 123 13 64Z"
            transform="translate(2 7)"
            fill={`url(#${id}-show-side)`}
          />
          <path
            d="M13 64Q61 1 111 64Q62 123 13 64Z"
            fill={`url(#${id}-show-face)`}
          />
          <circle cx="62" cy="63" r="20" fill="#54765b" />
          <circle cx="58" cy="59" r="9" fill="#dfebd7" />
        </>
      ) : name === "hide" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-hide-side`}
              x1="25"
              y1="36"
              x2="103"
              y2="105"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-hide-face`} cx=".34" cy=".23" r=".78">
              <stop stopColor="#fffdf6" />
              <stop offset=".45" stopColor="#cfddc8" />
              <stop offset="1" stopColor="#739579" />
            </radialGradient>
            <linearGradient
              id={`${id}-hide-rim`}
              x1="30"
              y1="22"
              x2="98"
              y2="101"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".5" stopColor="#91af8f" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M13 64Q61 1 111 64Q62 123 13 64Z"
            transform="translate(2 7)"
            fill={`url(#${id}-hide-side)`}
          />
          <path
            d="M13 64Q61 1 111 64Q62 123 13 64Z"
            fill={`url(#${id}-hide-face)`}
          />
          <circle cx="62" cy="63" r="19" fill="#54765b" />
          <path
            d="M25 23L100 103"
            stroke="#365b3e"
            strokeWidth="11"
            strokeLinecap="round"
          />
        </>
      ) : name === "login" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-login-side`}
              x1="25"
              y1="36"
              x2="103"
              y2="105"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-login-face`} cx=".34" cy=".23" r=".78">
              <stop stopColor="#fffdf6" />
              <stop offset=".45" stopColor="#cfddc8" />
              <stop offset="1" stopColor="#739579" />
            </radialGradient>
            <linearGradient
              id={`${id}-login-rim`}
              x1="30"
              y1="22"
              x2="98"
              y2="101"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".5" stopColor="#91af8f" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M23 53H76L61 36Q57 30 64 25Q69 21 74 26L109 60Q114 65 109 70L74 104Q68 109 63 104Q57 99 62 93L77 77H23Q15 77 15 65Q15 53 23 53Z"
            transform="translate(2 7)"
            fill={`url(#${id}-login-side)`}
          />
          <path
            d="M23 53H76L61 36Q57 30 64 25Q69 21 74 26L109 60Q114 65 109 70L74 104Q68 109 63 104Q57 99 62 93L77 77H23Q15 77 15 65Q15 53 23 53Z"
            fill={`url(#${id}-login-face)`}
          />
        </>
      ) : name === "loading" ? (
        <>
          <defs>
            <linearGradient
              id={`${id}-loading-side`}
              x1="25"
              y1="30"
              x2="100"
              y2="108"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#91af8f" />
              <stop offset="1" stopColor="#3f634d" />
            </linearGradient>
            <radialGradient id={`${id}-loading-face`} cx=".3" cy=".18" r=".9">
              <stop stopColor="#f0f5e9" />
              <stop offset=".5" stopColor="#bed1b4" />
              <stop offset="1" stopColor="#6e9474" />
            </radialGradient>
            <linearGradient
              id={`${id}-loading-rim`}
              x1="30"
              y1="25"
              x2="92"
              y2="104"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#dfebd7" />
              <stop offset=".4" stopColor="#a8c3a4" />
              <stop offset="1" stopColor="#54765b" />
            </linearGradient>
          </defs>
          <path
            d="M92 34A39 39 0 1 0 101 76"
            transform="translate(0 5)"
            fill="none"
            stroke={`url(#${id}-loading-side)`}
            strokeWidth="17"
            strokeLinecap="round"
          />
          <path
            d="M92 34A39 39 0 1 0 101 76"
            fill="none"
            stroke={`url(#${id}-loading-rim)`}
            strokeWidth="17"
            strokeLinecap="round"
          />
          <path
            d="M90 32A39 39 0 0 0 27 64"
            fill="none"
            stroke="#cdddbe"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      ) : null}
    </svg>
  );
}
