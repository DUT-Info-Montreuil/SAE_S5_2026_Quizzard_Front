// Destinations STOMP de l'écran projeté E5 (docs/API.md du back, « Temps réel du déroulement »).
export function destinationsAnimation(codeAcces: string) {
  const base = `/topic/sessions/${codeAcces}`
  return {
    etat: `${base}/etat`,
    question: `${base}/question`,
    correction: `${base}/correction`,
    repartition: `${base}/repartition`,
    connectes: `${base}/connectes`,
    ecran: `${base}/ecran`,
  } as const
}

export type CanalAnimation = keyof ReturnType<typeof destinationsAnimation>
