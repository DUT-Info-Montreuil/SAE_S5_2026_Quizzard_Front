// Données de test de l'UC7 : corps JSON tels que le back les envoie (docs/API.md du back, « Lancer et dérouler »).

export function questionJson(remplacements: object = {}) {
  return {
    idQuestion: 12, position: 1, type: 'QCM', enonce: 'Quel protocole sert à l\'annuaire ?', dureeSec: 20,
    echeance: '2026-11-25T14:01:20+01:00', choixMultiple: false,
    propositions: [{ idProposition: 41, libelle: 'LDAP' }, { idProposition: 42, libelle: 'SMTP' }],
    ...remplacements,
  }
}

export function etatJson(remplacements: object = {}) {
  return {
    idSession: 7, idQuiz: 3, titre: 'Quiz du chapitre 3', statut: 'PREPAREE', modeNote: false, nbQuestions: 2,
    position: 0, codeAcces: 'code-acces', lienAcces: 'http://localhost:5173/rejoindre/code-acces', qrCode: 'iVBORw0KGgo=',
    dateLancement: '2026-11-25T14:00:00+01:00', connectes: 0, questionOuverte: false,
    ...remplacements,
  }
}

export function etatQuestionOuverteJson(remplacements: object = {}) {
  return etatJson({
    statut: 'EN_COURS', position: 1, connectes: 24, questionOuverte: true, question: questionJson(),
    tempsRestantMs: 15_000, repartition: { idQuestion: 12, total: 0, propositions: [] },
    ...remplacements,
  })
}

export function correctionJson(remplacements: object = {}) {
  return {
    idQuestion: 12, position: 1, type: 'QCM', bonnesPropositions: [41], paires: [], reponsesAcceptees: [], total: 10,
    repartition: [{ idProposition: 41, nombre: 7 }, { idProposition: 42, nombre: 3 }],
    ...remplacements,
  }
}

/** Réponse HTTP du back. */
export function reponseJson(corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } })
}

export function erreurJson(statut: number, error: string, code?: string): Response {
  return reponseJson({ error, request_id: 'req-1', code }, statut)
}

/**
 * Remplace `fetch` par un back simulé. `repondre` reçoit « MÉTHODE chemin » et le corps envoyé. Renvoie la liste des
 * requêtes reçues, hors jeton CSRF (404, comme le back actuel).
 */
export function backSimule(repondre: (requete: string, corps: unknown) => Response): string[] {
  const requetes: string[] = []
  globalThis.fetch = (url, options) => {
    const requete = `${options?.method ?? 'GET'} ${new URL(String(url)).pathname}`
    if (requete === 'GET /api/auth/csrf') return Promise.resolve(erreurJson(404, 'Ressource introuvable.'))
    requetes.push(requete)
    try {
      return Promise.resolve(repondre(requete, options?.body ? JSON.parse(String(options.body)) : undefined))
    } catch (e) {
      return Promise.reject(e as Error)
    }
  }
  return requetes
}
