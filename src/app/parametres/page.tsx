/**
 * MailFlow · Paramètres
 *
 * Page affichant les paramètres de l'application (lecture seule).
 */

import { Sidebar } from "../components/Sidebar";
import { chargerParametres, chargerCompteursSidebar } from "../../donnees/pages";
import { IconeReglages, IconeRecherche } from "../icones";

export const dynamic = "force-dynamic";

export default async function Parametres() {
  const d = await chargerParametres();
  const compteurs = await chargerCompteursSidebar();

  return (
    <div className="appli">
      <Sidebar routeActuelle="/parametres" compteurs={compteurs} />

      <div className="principal">
        <header className="barre">
          <form className="recherche" action="/parametres" method="get" role="search">
            <IconeRecherche />
            <input
              type="search"
              name="q"
              placeholder="Rechercher un paramètre…"
              aria-label="Rechercher"
            />
            <span className="raccourci">Entrée</span>
          </form>

          <div className="actions">
            <button className="bouton-icone" aria-label="Notifications" type="button">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          </div>
        </header>

        <main className="contenu">
          <div className="entete">
            <div>
              <h1>Paramètres</h1>
              <p className="sous">
                Configuration de l'application
              </p>
            </div>
          </div>

          <div className="duo">
            <section className="carte">
              <div className="carte-tete">
                <div className="picto r-bleu">
                  <IconeReglages />
                </div>
                <h2>Paramètres généraux</h2>
              </div>
              <div className="carte-corps">
                {d.parametres.length === 0 && (
                  <div className="vide">
                    Aucun paramètre configuré.
                  </div>
                )}
                {d.parametres.map((param) => (
                  <div className="info-ligne" key={param.cle}>
                    <span className="label">{param.libelle}</span>
                    <span>
                      {typeof param.valeur === "object"
                        ? JSON.stringify(param.valeur)
                        : String(param.valeur)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="carte">
              <div className="carte-tete">
                <div className="picto r-violet">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h2>Boîtes suivies</h2>
              </div>
              <div className="carte-corps">
                {d.boites.length === 0 && (
                  <div className="vide">
                    Aucune boîte configurée.
                  </div>
                )}
                {d.boites.map((boite) => (
                  <div className="info-ligne" key={boite.id}>
                    <span className="label">{boite.libelle}</span>
                    <span>
                      {boite.adresse}
                      {boite.actif ? (
                        <span className="pastille past-vert" style={{ marginLeft: "8px" }}>
                          Actif
                        </span>
                      ) : (
                        <span className="pastille past-gris" style={{ marginLeft: "8px" }}>
                          Inactif
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="carte">
            <div className="carte-tete">
              <div className="picto r-jaune">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <h2>Jours fériés</h2>
            </div>
            <div className="carte-corps">
              {d.joursFeries.length === 0 && (
                <div className="vide">
                  Aucun jour férié configuré.
                </div>
              )}
              <div className="enveloppe-tableau">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Libellé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.joursFeries.map((jf) => (
                      <tr key={jf.id}>
                        <td className="tnum">
                          {new Date(jf.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </td>
                        <td>{jf.libelle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
