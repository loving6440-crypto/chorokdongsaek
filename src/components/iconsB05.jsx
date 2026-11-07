// v-B.05 개척 재료 33종의 아이콘. 같은 갈래(깃털·털·열매·뿌리…)는 그림을 같이 쓰고 바탕색으로 나눈다.
const W = '#fbf6e9'
const W2 = '#e7dcc2'
const K = '#2f3447'
const Y = '#f5c84c'
const G = '#4f9d6b'
const BR = '#6b4a3a'

const ART = {
  feather: (
    <>
      <path d="M44 14 C28 20 20 34 20 48 L24 50 C30 38 38 28 44 14z" fill={W} />
      <path d="M44 14 C40 30 32 42 24 50" fill="none" stroke={K} strokeWidth="2" strokeLinecap="round" />
      <path d="M20 48 L16 54" stroke={K} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M30 30 l5 2 M27 36 l5 2 M25 42 l4 2" stroke={W2} strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  fur: (
    <>
      <ellipse cx="26" cy="38" rx="10" ry="13" fill={W} transform="rotate(-18 26 38)" />
      <ellipse cx="37" cy="36" rx="10" ry="14" fill={W2} transform="rotate(14 37 36)" />
      <ellipse cx="32" cy="34" rx="8" ry="13" fill={W} />
      <path d="M28 24 q4 -6 8 0 M24 30 q3 -4 6 -1 M36 29 q3 -3 6 1" fill="none" stroke={K} strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
    </>
  ),
  nut: (
    <>
      <path d="M20 30 q12 -12 24 0 v2 h-24z" fill={BR} />
      <path d="M20 32 h24 q0 18 -12 20 q-12 -2 -12 -20z" fill={W} />
      <path d="M32 18 v-4" stroke={BR} strokeWidth="3" strokeLinecap="round" />
      <path d="M24 26 h16" stroke={W2} strokeWidth="1.4" opacity=".7" />
      <circle cx="27" cy="38" r="2" fill="#fff" opacity=".6" />
    </>
  ),
  root: (
    <>
      <path d="M30 16 q8 0 6 10 q-2 10 2 16 q3 6 -4 12 q-4 -6 -6 -14 q-2 -10 -4 -14 q-2 -10 6 -10z" fill={W} />
      <path d="M30 16 q-4 -4 -8 -2 M32 16 q4 -5 9 -3 M31 16 q0 -5 1 -7" stroke={G} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M28 32 l-7 3 M34 40 l7 2 M30 46 l-5 4" stroke={W2} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  berry: (
    <>
      <circle cx="27" cy="34" r="6" fill={W} />
      <circle cx="37" cy="34" r="6" fill={W2} />
      <circle cx="32" cy="42" r="6" fill={W} />
      <circle cx="24" cy="44" r="5" fill={W2} />
      <circle cx="40" cy="44" r="5" fill={W} />
      <path d="M32 28 v-8 q6 -4 10 0" stroke={G} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M33 22 q-8 -6 -12 0 q6 4 12 0z" fill={G} />
    </>
  ),
  flower: (
    <>
      <g fill={W}>
      <circle cx="32" cy="22" r="7" />
      <circle cx="42" cy="30" r="7" />
      <circle cx="38" cy="42" r="7" />
      <circle cx="26" cy="42" r="7" />
      <circle cx="22" cy="30" r="7" />
      </g>
      <circle cx="32" cy="33" r="5.5" fill={Y} />
      <circle cx="32" cy="33" r="2" fill={BR} opacity=".5" />
    </>
  ),
  leaf: (
    <>
      <path d="M18 46 C18 26 32 16 46 16 C46 32 36 46 18 46z" fill={W} />
      <path d="M18 46 L40 22 M26 38 l-2 -6 M32 32 l-1 -6 M30 36 l6 0 M36 28 l6 0" stroke={G} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  mushroom: (
    <>
      <path d="M16 34 q16 -22 32 0z" fill={W} />
      <path d="M27 34 h10 l-1 16 h-8z" fill={W2} />
      <circle cx="26" cy="27" r="2.4" fill={BR} opacity=".45" />
      <circle cx="36" cy="25" r="2" fill={BR} opacity=".45" />
      <circle cx="31" cy="30" r="1.6" fill={BR} opacity=".45" />
    </>
  ),
  wood: (
    <>
      <rect x="16" y="26" width="32" height="18" rx="9" fill={W2} />
      <ellipse cx="40" cy="35" rx="8" ry="9" fill={W} />
      <ellipse cx="40" cy="35" rx="4.5" ry="5" fill="none" stroke={BR} strokeWidth="1.4" />
      <path d="M26 12 l-6 12 h6 l-4 10 l10 -14 h-6 l4 -8z" fill={K} />
    </>
  ),
  fang: (
    <>
      <path d="M24 16 q22 6 18 34 q-4 -2 -8 -1 q2 -18 -12 -28z" fill={W} />
      <path d="M27 22 q10 6 9 22" fill="none" stroke={W2} strokeWidth="2" strokeLinecap="round" />
      <path d="M22 16 q4 -2 6 2" stroke={K} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".5" />
    </>
  ),
  scale: (
    <>
      <path d="M32 14 l14 10 v16 l-14 10 l-14 -10 v-16z" fill={W} />
      <path d="M18 24 q14 10 28 0 M18 32 q14 10 28 0 M18 40 q14 8 28 0" fill="none" stroke={BR} strokeWidth="1.6" opacity=".55" />
      <circle cx="27" cy="22" r="2" fill="#fff" opacity=".7" />
    </>
  ),
  wing: (
    <>
      <path d="M32 22 q-10 -8 -18 2 q4 2 4 6 q4 -2 6 2 q4 -2 8 2z" fill={W} />
      <path d="M32 22 q10 -8 18 2 q-4 2 -4 6 q-4 -2 -6 2 q-4 -2 -8 2z" fill={W2} />
      <ellipse cx="32" cy="32" rx="3.5" ry="7" fill={K} />
      <path d="M29 25 l-1.5 -3 M35 25 l1.5 -3" stroke={K} strokeWidth="1.6" strokeLinecap="round" />
      <g fill={Y}>
      <circle cx="20" cy="26" r="1.4" />
      <circle cx="44" cy="26" r="1.4" />
      </g>
      <path d="M24 42 q8 6 16 0" fill="none" stroke={W} strokeWidth="2" strokeLinecap="round" opacity=".8" />
    </>
  ),
  shell: (
    <>
      <ellipse cx="32" cy="34" rx="16" ry="14" fill={W} />
      <path d="M32 22 l6 4 v7 l-6 4 l-6 -4 v-7z" fill="none" stroke={K} strokeWidth="1.6" opacity=".6" />
      <path d="M32 37 v9 M38 33 l7 3 M26 33 l-7 3 M38 26 l6 -4 M26 26 l-6 -4" stroke={K} strokeWidth="1.4" opacity=".45" />
    </>
  ),
}

export const B05_ICONS = {
  'acorn': { bg: 'orange', art: ART.nut },
  'chestnut': { bg: 'red', art: ART.nut },
  'pheasant-feather': { bg: 'orange', art: ART.feather },
  'arrowroot': { bg: 'sand', art: ART.root },
  'deodeok': { bg: 'green', art: ART.root },
  'doraji': { bg: 'purple', art: ART.flower },
  'dangwi': { bg: 'green', art: ART.leaf },
  'badger-fur': { bg: 'navy', art: ART.fur },
  'wild-grape': { bg: 'purple', art: ART.berry },
  'omija': { bg: 'red', art: ART.berry },
  'lightning-jujube': { bg: 'yellow', art: ART.wood },
  'pine-nut': { bg: 'sand', art: ART.nut },
  'marten-fur': { bg: 'yellow', art: ART.fur },
  'songi': { bg: 'sand', art: ART.mushroom },
  'hawk-feather': { bg: 'navy', art: ART.feather },
  'wolf-fang': { bg: 'navy', art: ART.fang },
  'bear-fur': { bg: 'navy', art: ART.fur },
  'frost-flower': { bg: 'blue', art: ART.flower },
  'goral-horn': { bg: 'sand', art: ART.fang },
  'somdari': { bg: 'teal', art: ART.flower },
  'magpie-feather': { bg: 'blue', art: ART.feather },
  'gold-toad-skin': { bg: 'yellow', art: ART.shell },
  'wild-ginseng': { bg: 'red', art: ART.root },
  'weasel-fur': { bg: 'blue', art: ART.fur },
  'owl-feather': { bg: 'sand', art: ART.feather },
  'crane-feather': { bg: 'teal', art: ART.feather },
  'lingzhi': { bg: 'red', art: ART.mushroom },
  'dragon-mane': { bg: 'purple', art: ART.fur },
  'turtle-shell': { bg: 'green', art: ART.shell },
  'white-squirrel-tail': { bg: 'teal', art: ART.fur },
  'golden-serpent-scale': { bg: 'yellow', art: ART.scale },
  'fortune-bat-wing': { bg: 'purple', art: ART.wing },
  'haedongcheong-feather': { bg: 'red', art: ART.feather },
}
