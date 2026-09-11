/**
 * MailFlow · Relances
 *
 * Page affichant l'historique des relances envoyées.
 */

import { Sidebar } from "../components/Sidebar";
import { chargerRelances, chargerCompteursSidebar } from "../../donnees/pages";
import { echeanceLisible, ilYA } from "../format";
import { IconeRelance, IconeRecherche } from "../icones";

export const dynamic = "force-dynamic";

export default async function Relances() {
  const d = await chargerRelances();
  const compteurs = await chargerCompteursSidebar();
  const now = d.maintenant;

  return (
    <div className="appli">
      <Sidebar routeActuelle="/relances" compteurs={compteurs} />

      <div className="principal">
        <header className="barre">
          <form className="recherche" action="/relances" method="get" role="search">
            <IconeRecherche />
            <input
              type="search"
              name="q"
              placeholder="Rechercher une relance…"
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
              <h1>Relances</h1>
              <p className="sous">
                Historique des relances envoyées ({d.total} au total)
              </p>
            </div>
          </div>

          <section className="carte">
            <div className="carte-tete">
              <div className="picto r-violet">
                <IconeRelance />
              </div>
              <div>
                <h2>Historique des relances</h2>
                <div className="sous">
                  Toutes les relances envoyées, triées par date d'envoi
                </div>
              </div>
            </div>

            <div className="enveloppe-tableau">
              <table>
                <thead>
                  <tr>
                    <th>Échange</th>
                    <th>Expéditeur</th>
                    <th>Destinataire</th>
                    <th>Rang</th>
                    <th>Date d'envoi</th>
                    <th>Statut</th>
                    <th>Modèle</th>
                  </tr>
                </thead>
                <tbody>
                  {d.relances.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="vide">
                          Aucune relance envoyée pour le moment.
                        </div>
                      </td>
                    </tr>
                  )}
                  {d.relances.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="cellule-sujet">
                          <div>
                            <a href={`/echange/${r.echange.id}`} className="sujet-titre">
                              #{r.echange.numero} · {r.echange.sujet}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="exp-mail">{r.echange.correspondant.email}</div>
                        <div className="exp-org">{r.echange.correspondant.organisation ?? "—"}</div>
                      </td>
                      <td>
                        <div className="resp">
                          <span className="avatar s">{r.destinataire.initiales ?? "?"}</span>
                          <span className="nom">{r.destinataire.nomComplet.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td>
                        <span className="tnum">n° {r.ordre}</span>
                      </td>
                      <td>
                        <div className="relance-date tnum">
                          {echeanceLisible(r.envoyeeLe, now)}
                        </div>
                        <div className="relance-heure">
                          {ilYA(r.envoyeeLe, now)}
                        </div>
                      </td>
                      <td>
                        {r.statut === "ENVOYEE" ? (
                          <span className="pastille past-vert">Envoyée</span>
                        ) : (
                          <span className="pastille past-rouge">Échec</span>
                        )}
                        {r.erreur && (
                          <div className="relance-heure" style={{ color: "var(--rouge)" }}>
                            {r.erreur}
                          </div>
                        )}
                      </td>
                      <td>
                        {r.modele ? (
                          <span className="pastille past-bleu">{r.modele.libelle}</span>
                        ) : (
                          <span className="resp vide">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pied-tableau">
              <span>
                {d.relances.length} affichée{d.relances.length > 1 ? "s" : ""} sur {d.total}
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
