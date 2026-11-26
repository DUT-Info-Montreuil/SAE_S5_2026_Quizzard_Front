// Destinations STOMP de l'étudiant pendant une séance (plan UC9, B6). Seul endroit où elles sont écrites.
//
// TODO(UC9): correspondance entre les événements du dossier v3 et ces destinations non confirmée (plan UC9,
// question O1) : `question_demarree` → /question ? `question_close` → /etat ou /correction ? `session_terminee` →
// /etat avec etat = CLOTUREE ? résultat personnel → /user/queue/resultat ? Valeurs provisoires : docs/API.md du
// back §4.

export function destinationsSeance(codeAcces: string) {
  const base = `/topic/sessions/${codeAcces}`
  return {
    question: `${base}/question`,
    etat: `${base}/etat`,
    correction: `${base}/correction`,
    resultat: '/user/queue/resultat',
  } as const
}

export type CanalSeance = keyof ReturnType<typeof destinationsSeance>
