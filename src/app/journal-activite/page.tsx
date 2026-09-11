/**
 * MailFlow · Journal d'activité
 *
 * Page affichant l'historique des événements du système.
 */

import { Sidebar } from "../components/Sidebar";
import { chargerJournalActivite, chargerCompteursSidebar } from "../../donnees/pages";
import { ilYA, libelleEvenement, classeEvenement } from "../format";
import { IconeJournal, IconeRecherche, IconeValide, IconeRelance, IconeMail, IconeArchive } from "../icones";

export const dynamic = "force-dynamic";

export default async function JournalActivite() {
  const d = await chargerJournalActivite();
  const compteurs = await chargerCompteursSidebar();
  const now = d.maintenant;

  return (
    <div className="appli">
      <Sidebar routeActuelle="/journal-activite" compteurs={compteurs} />

      <div className="principal">
        <header className="barre">
          <form className="recherche" action="/journal-activite" method="get" role="search">
            <IconeRecherche />
            <input
              type="search"
              name="q"
              placeholder="Rechercher un événement…"
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
              <h1>Journal d'activité</h1>
              <p className="sous">
                {d.total} événement{d.total > 1 ? "s" : ""} enregistré{d.total > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <section className="carte">
            <div className="carte-tete">
              <div className="picto r-bleu">
                <IconeJournal />
              </div>
              <div>
                <h2>Historique des événements</h2>
                <div className="sous">
                  Toutes les actions et événements système, triés par date
                </div>
              </div>
            </div>

            <div className="carte-corps activite">
              {d.evenements.length === 0 && (
                <div className="vide">
                  Aucun événement enregistré pour le moment.
                </div>
              )}
              {d.evenements.map((ev) => (
                <div className="activite-ligne" key={ev.id}>
                  <div className={`picto ${classeEvenement(ev.type)}`}>
                    {ev.type.startsWith("REPONSE") ? (
                      <IconeValide />
                    ) : ev.type.startsWith("RELANCE") ? (
                      <IconeRelance />
                    ) : ev.type === "MAIL_ARCHIVE" ? (
                      <IconeArchive />
                    ) : (
                      <IconeMail />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="titre">{libelleEvenement(ev.type)}</div>
                    <div className="detail">{ev.libelle}</div>
                    {ev.echange && (
                      <div className="detail">
                        <a href={`/echange/${ev.echange.id}`} className="lien">
                          #{ev.echange.numero} · {ev.echange.sujet}
                        </a>
                      </div>
                    )}
                    <div className="quand">
                      {ev.utilisateur ? (
                        <>
                          <span className="nom">{ev.utilisateur.nomComplet}</span>
                          {" · "}
                        </>
                      ) : (
                        <>
                          <span className="nom">Système</span>
                          {" · "}
                        </>
                      )}
                      {ilYA(ev.creeLe, now)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pied-tableau">
              <span>
                {d.evenements.length} affiché{d.evenements.length > 1 ? "s" : ""} sur {d.total}
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
