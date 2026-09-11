/**
 * MailFlow · Règles de relance
 *
 * Page affichant les règles de relance par catégorie (lecture seule).
 */

import { Sidebar } from "../components/Sidebar";
import { chargerReglesRelance, chargerCompteursSidebar } from "../../donnees/pages";
import { IconeRegles, IconeRecherche } from "../icones";

export const dynamic = "force-dynamic";

export default async function ReglesRelance() {
  const d = await chargerReglesRelance();
  const compteurs = await chargerCompteursSidebar();

  return (
    <div className="appli">
      <Sidebar routeActuelle="/regles-relance" compteurs={compteurs} />

      <div className="principal">
        <header className="barre">
          <form className="recherche" action="/regles-relance" method="get" role="search">
            <IconeRecherche />
            <input
              type="search"
              name="q"
              placeholder="Rechercher une règle…"
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
              <h1>Règles de relance</h1>
              <p className="sous">
                {d.total} catégori{d.total > 1 ? "es" : "e"} configurée{d.total > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {d.categories.length === 0 && (
            <section className="carte">
              <div className="carte-corps">
                <div className="vide">
                  Aucune règle de relance configurée.
                </div>
              </div>
            </section>
          )}

          {d.categories.map((cat) => (
            <section className="carte" key={cat.id}>
              <div className="carte-tete">
                <div
                  className="picto"
                  style={{ background: cat.couleur + "20", color: cat.couleur }}
                >
                  <IconeRegles />
                </div>
                <div>
                  <h2>{cat.libelle}</h2>
                  <div className="sous">
                    {cat.code} · Priorité: {cat.priorite}
                    {cat.aDateButoir && " · Date butoir"}
                  </div>
                </div>
                {cat.escaladeVers && (
                  <div className="carte-tete" style={{ marginLeft: "auto", border: "none", padding: 0 }}>
                    <div className="resp">
                      <span className="avatar s">{cat.escaladeVers.initiales ?? "?"}</span>
                      <span className="nom">Escalade vers {cat.escaladeVers.nomComplet.split(" ")[0]}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="carte-corps">
                {cat.regles.length === 0 ? (
                  <div className="vide">
                    Aucune règle de relance configurée pour cette catégorie.
                  </div>
                ) : (
                  <div className="enveloppe-tableau">
                    <table>
                      <thead>
                        <tr>
                          <th>Rang</th>
                          <th>Délai (jours ouvrés)</th>
                          <th>Destinataire</th>
                          <th>Copie à</th>
                          <th>Modèle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.regles.map((regle) => (
                          <tr key={regle.id}>
                            <td>
                              <span className="tnum">n° {regle.ordre}</span>
                            </td>
                            <td>
                              <span className="tnum">{regle.delaiJoursOuvres} j</span>
                            </td>
                            <td>
                              <span className="pastille past-bleu">{regle.destinataire}</span>
                            </td>
                            <td>
                              {regle.copieA.length > 0 ? (
                                <span className="pastille past-gris">
                                  {regle.copieA.join(", ")}
                                </span>
                              ) : (
                                <span className="resp vide">—</span>
                              )}
                            </td>
                            <td>
                              {regle.modele ? (
                                <span className="pastille past-violet">{regle.modele.libelle}</span>
                              ) : (
                                <span className="resp vide">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
