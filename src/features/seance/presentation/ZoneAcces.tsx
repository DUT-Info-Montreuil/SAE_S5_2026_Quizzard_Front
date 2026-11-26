import { LIBELLES_ANIMATION as L } from './libellesAnimation.ts'

interface ZoneAccesProps {
  lienAcces: string
  /** Adresse `data:image/png;base64,…` du QR code généré par le back ; `null` s'il manque. */
  qrCode: string | null
  modeNote: boolean
}

/** E5 : QR code et lien d'accès, affichés jusqu'à la fin de la séance (un étudiant peut rejoindre à tout moment). */
export function ZoneAcces({ lienAcces, qrCode, modeNote }: ZoneAccesProps) {
  return (
    <section className="zone-acces" aria-label={L.rejoindre}>
      {qrCode !== null && <img className="zone-acces-qr" src={qrCode} alt={L.qrCode} />}
      <div className="zone-acces-texte">
        <p className="zone-acces-titre">{L.rejoindre}</p>
        <p className="zone-acces-lien">{lienAcces}</p>
        {modeNote && <p className="zone-acces-note">{L.quizNote}</p>}
      </div>
    </section>
  )
}
