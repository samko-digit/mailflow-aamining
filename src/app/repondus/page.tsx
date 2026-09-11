/**
 * MailFlow · Répondus
 *
 * Page affichant les échanges ayant reçu une réponse (statut REPONDU).
 */

import { Sidebar } from "../components/Sidebar";
import { chargerRepondus, chargerCompteursSidebar } from "../../donnees/pages";
import {
  couleurPriorite,
  echeanceLisible,
  ilYA,
  pastilleStatut,
} from "../format";
import {
  IconeValide,
  IconeOeil,
  IconeRecherche,
} from "../icones";

export const dynamic = "force-dynamic";

export default async function Repondus() {
  const d = await chargerRepondus();
  const compteurs = await chargerCompteursSidebar();
  const now = d.maintenant;

  return (
    <div className="appli">
      <Sidebar routeActuelle="/repondus" compteurs={compteurs} />

      <div className="principal">
        <header className="barre">
          <form className="recherche" action="/repondus" method="get" role="search">
            <IconeRecherche />
            <input
              type="search"
              name="q"
              placeholder="Rechercher une réponse…"
              aria-label="Rechercher"
            />
            <span className="raccourci">Entrée</span>
          </form>

        </header>

        <main className="contenu">
          <div className="entete">
            <div>
              <h1>Répondus</h1>
              <p className="sous">
                {d.total} échange{d.total > 1 ? "s" : ""} ayant reçu une réponse
              </p>
            </div>
          </div>

          <section className="carte">
            <div className="carte-tete">
              <div className="picto r-vert">
                <IconeValide />
              </div>
              <div>
                <h2>Échanges répondus</h2>
                <div className="sous">
                  Triés par date de réponse, du plus récent au plus ancien
                </div>
              </div>
            </div>

            <div className="enveloppe-tableau">
              <table>
                <thead>
                  <tr>
                    <th>Sujet</th>
                    <th>Expéditeur</th>
                    <th>Responsable</th>
                    <th>Date de réponse</th>
                    <th>Canal</th>
                    <th>Statut</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {d.echanges.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="vide">
                          Aucune réponse enregistrée pour le moment.
                        </div>
                      </td>
                    </tr>
                  )}
                  {d.echanges.map((e) => {
                    const p = pastilleStatut(e.statut, null, now);
                    return (
                      <tr key={e.id}>
                        <td>
                          <div className="cellule-sujet">
                            <span className="liseré" style={{ background: couleurPriorite(e.priorite) }} />
                            <div>
                              <a href={`/echange/${e.id}`} className="sujet-titre">
                                {e.sujet}
                                {e.aPieceJointe && (
                                  <svg className="trombone" viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.6}>
                                    <path d="M20 11.5 12.4 19a4.6 4.6 0 0 1-6.5-6.5l7.8-7.8a3.1 3.1 0 0 1 4.4 4.4l-7.7 7.7a1.6 1.6 0 0 1-2.2-2.2l7-7" />
                                  </svg>
                                )}
                              </a>
                              <div className="sujet-extrait">{e.extrait}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="exp-mail">{e.correspondant.email}</div>
                          <div className="exp-org">{e.correspondant.organisation ?? "—"}</div>
                        </td>
                        <td>
                          {e.responsable ? (
                            <div className="resp">
                              <span className="avatar s">{e.responsable.initiales ?? "?"}</span>
                              <span className="nom">{e.responsable.nomComplet.split(" ")[0]}</span>
                            </div>
                          ) : (
                            <span className="resp vide">—</span>
                          )}
                        </td>
                        <td>
                          {e.reponduLe ? (
                            <>
                              <div className="relance-date tnum">
                                {echeanceLisible(e.reponduLe, now)}
                              </div>
                              <div className="relance-heure">
                                {ilYA(e.reponduLe, now)}
                              </div>
                            </>
                          ) : (
                            <span className="resp vide">—</span>
                          )}
                        </td>
                        <td>
                          {e.canalReponse ? (
                            <span className="pastille past-bleu">{e.canalReponse}</span>
                          ) : (
                            <span className="pastille past-vert">Mail</span>
                          )}
                        </td>
                        <td>
                          <span className={`pastille ${p.classe}`}>{p.libelle}</span>
                        </td>
                        <td>
                          <div className="actions-ligne">
                            {e.webLink && (
                              <a
                                className="mini"
                                href={e.webLink}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Ouvrir le message d'origine"
                                title="Ouvrir le message d'origine"
                              >
                                <IconeOeil />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pied-tableau">
              <span>
                {d.echanges.length} affiché{d.echanges.length > 1 ? "s" : ""} sur {d.total}
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
