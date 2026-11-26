interface ZoneAccesProps {
  lienAcces: string
  /** PNG en base64, généré par le back. */
  qrCode: string | null
  modeNote: boolean
}

/** E5 : QR code et lien d'accès, affichés jusqu'à la fin de la séance (un étudiant peut rejoindre à tout moment). */
export function ZoneAcces({ lienAcces, qrCode, modeNote }: ZoneAccesProps) {
  return (
    <section className="zone-acces" aria-label="Accès des étudiants">
      {qrCode !== null && (
        <img className="zone-acces-qr" src={`data:image/png;base64,${qrCode}`} alt="QR code pour rejoindre le quiz" />
      )}
      <div>
        <p className="zone-acces-titre">Rejoindre le quiz</p>
        <p className="zone-acces-lien">{lienAcces}</p>
        {modeNote && <p>Quiz noté : connexion avec le compte de l'IUT.</p>}
      </div>
    </section>
  )
}
