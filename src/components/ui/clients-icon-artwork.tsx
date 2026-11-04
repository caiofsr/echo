export function ClientsIconArtwork({ id }: { id: string }) {
  return (
    <>
      <defs>
        <radialGradient
          id={`${id}-clients-rear-shirt`}
          cx=".25"
          cy=".15"
          r=".95"
        >
          <stop stopColor="#9cba9e" />
          <stop offset=".36" stopColor="#719776" />
          <stop offset=".73" stopColor="#44694b" />
          <stop offset="1" stopColor="#2a4630" />
        </radialGradient>
        <radialGradient id={`${id}-clients-rear-head`} cx=".27" cy=".2" r=".85">
          <stop stopColor="#e7bb91" />
          <stop offset=".4" stopColor="#c7946b" />
          <stop offset=".78" stopColor="#9a6848" />
          <stop offset="1" stopColor="#754a33" />
        </radialGradient>
        <radialGradient
          id={`${id}-clients-front-shirt`}
          cx=".26"
          cy=".15"
          r=".95"
        >
          <stop stopColor="#dfedda" />
          <stop offset=".34" stopColor="#b4d0ac" />
          <stop offset=".7" stopColor="#7ea578" />
          <stop offset="1" stopColor="#456e48" />
        </radialGradient>
        <radialGradient
          id={`${id}-clients-front-head`}
          cx=".28"
          cy=".19"
          r=".88"
        >
          <stop stopColor="#fff0d9" />
          <stop offset=".37" stopColor="#e5c8a6" />
          <stop offset=".76" stopColor="#bc9671" />
          <stop offset="1" stopColor="#957153" />
        </radialGradient>
        <linearGradient
          id={`${id}-clients-neck`}
          x1="68"
          y1="57"
          x2="83"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#d3ae86" />
          <stop offset="1" stopColor="#9d7957" />
        </linearGradient>
        <filter
          id={`${id}-clients-shadow`}
          x="4"
          y="94"
          width="120"
          height="32"
          filterUnits="userSpaceOnUse"
        >
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      <g id={`${id}-clients-ground`}>
        <ellipse
          cx="66"
          cy="111"
          rx="44"
          ry="6"
          fill="#24382a"
          opacity=".15"
          filter={`url(#${id}-clients-shadow)`}
        />
      </g>
      <g id={`${id}-clients-rear-person`}>
        <path
          d="M17 79C17 61 28 49 42 49C58 49 69 62 69 79L69 83C69 91 17 91 17 83Z"
          fill={`url(#${id}-clients-rear-shirt)`}
        />
        <path d="M35 42L48 42L49 55C46 59 36 58 34 54Z" fill="#a77b53" />
        <ellipse
          cx="41"
          cy="32"
          rx="15"
          ry="17"
          fill={`url(#${id}-clients-rear-head)`}
        />
      </g>
      <g id={`${id}-clients-front-person`}>
        <path
          d="M40 99C40 78 55 64 74 64C94 64 109 79 109 100L109 102C109 110 40 110 40 102Z"
          fill={`url(#${id}-clients-front-shirt)`}
        />
        <path
          d="M67 57L82 57L84 69C80 74 69 73 65 69Z"
          fill={`url(#${id}-clients-neck)`}
        />
        <ellipse
          cx="74"
          cy="46"
          rx="18"
          ry="20"
          fill={`url(#${id}-clients-front-head)`}
        />
      </g>
    </>
  );
}
