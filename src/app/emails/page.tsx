/**
 * MailFlow · Tous les e-mails
 *
 * Page affichant tous les échanges avec recherche.
 */

import { Sidebar } from "../components/Sidebar";
import { chargerTousEmails, chargerCompteursSidebar } from "../../donnees/pages";
import {
  couleurPriorite,
  echeanceLisible,
  pastilleStatut,
} from "../format";
import {
  IconeMail,
  IconeOeil,
  IconeRecherche,
} from "../icones";

export const dynamic = "force-dynamic";

export default async function TousEmails({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const d = await chargerTousEmails(q);
  const compteurs = await chargerCompteursSidebar();
  const now = d.maintenant;

  return (
    <div className="appli">
      <Sidebar routeActuelle="/emails" compteurs={compteurs} />

      <div className="principal">
        <header className="barre">
          <form className="recherche" action="/emails" method="get" role="search">
            <IconeRecherche />
            <input
              type="search"
              name="q"
              defaultValue={d.recherche}
              placeholder="Rechercher un e-mail, un contact, un sujet…"
              aria-label="Rechercher"
            />
            <span className="raccourci">Entrée</span>
          </form>

        </header>

        <main className="contenu">
          <div className="entete">
            <div>
              <h1>Tous les e-mails</h1>
              <p className="sous">
                {d.enRecherche
                  ? `Résultats pour « ${d.recherche} »`
                  : `${d.total} échange${d.total > 1 ? "s" : ""} au total`}
              </p>
            </div>
            {d.enRecherche && (
              <a href="/emails" className="lien">
                Effacer la recherche
              </a>
            )}
          </div>

          <section className="carte">
            <div className="carte-tete">
              <div className="picto r-bleu">
                <IconeMail />
              </div>
              <div>
                <h2>Ensemble des échanges</h2>
                <div className="sous">
                  {d.enRecherche
                    ? "Un nombre seul désigne un numéro d'échange. Sinon : objet, extrait et correspondant."
                    : "Tous les échanges, triés par date de réception"}
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
                    <th>Statut</th>
                    <th>Échéance</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {d.echanges.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="vide">
                          {d.enRecherche
                            ? "Aucun résultat ne correspond à votre recherche."
                            : "Aucun échange trouvé."}
                        </div>
                      </td>
                    </tr>
                  )}
                  {d.echanges.map((e) => {
                    const p = pastilleStatut(e.statut, e.echeance, now);
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
                          <span className={`pastille ${p.classe}`}>{p.libelle}</span>
                        </td>
                        <td>
                          {e.echeance ? (
                            <div className="relance-date tnum">
                              {echeanceLisible(e.echeance, now)}
                            </div>
                          ) : (
                            <span className="resp vide">—</span>
                          )}
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
