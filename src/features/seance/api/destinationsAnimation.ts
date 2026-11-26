// Destinations STOMP de l'écran projeté E5 (docs/API.md du back, §3.4 « Temps réel du déroulement » et §4).
// Seul endroit où elles sont écrites côté enseignant. Réception seule (CLAUDE.md, règle 4).
// `…/ecran` (écrans intermédiaires, UC14) et `…/classement` (UC11) : hors périmètre de l'UC7.

export function destinationsAnimation(codeAcces: string) {
  const base = `/topic/sessions/${codeAcces}`
  return {
    etat: `${base}/etat`,
    question: `${base}/question`,
    correction: `${base}/correction`,
    repartition: `${base}/repartition`,
    connectes: `${base}/connectes`,
  } as const
}

export type CanalAnimation = keyof ReturnType<typeof destinationsAnimation>
