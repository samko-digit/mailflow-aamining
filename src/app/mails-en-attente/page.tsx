/**
 * MailFlow · Mails en attente
 *
 * Page affichant les échanges nécessitant une action (statut EN_ATTENTE).
 */

import { Sidebar } from "../components/Sidebar";
import { chargerMailsEnAttente, chargerCompteursSidebar } from "../../donnees/pages";
import {
  attente,
  couleurPriorite,
  echeanceLisible,
  pastilleStatut,
} from "../format";
import {
  IconeHorloge,
  IconeOeil,
  IconePoints,
  IconeRecherche,
} from "../icones";
import { type Statut, transitionsPossibles } from "../../domaine/cycle-echange";
import {
  classerHorsPerimetre,
  consignerRelance,
  declarerReponse,
  escalader,
  qualifier,
  reattribuer,
  reporterRelance,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function MailsEnAttente({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const d = await chargerMailsEnAttente();
  const compteurs = await chargerCompteursSidebar();
  const now = d.maintenant;

  return (
    <div className="appli">
      <Sidebar routeActuelle="/mails-en-attente" compteurs={compteurs} />

      <div className="principal">
        <header className="barre">
          <form className="recherche" action="/mails-en-attente" method="get" role="search">
            <IconeRecherche />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Rechercher un e-mail, un contact, un sujet…"
              aria-label="Rechercher"
            />
            <span className="raccourci">Entrée</span>
          </form>

        </header>

        <main className="contenu">
          <div className="entete">
            <div>
              <h1>Mails en attente</h1>
              <p className="sous">
                {d.total} échange{d.total > 1 ? "s" : ""} nécessitant une action
              </p>
            </div>
          </div>

          <section className="carte">
            <div className="carte-tete">
              <div className="picto r-jaune">
                <IconeHorloge />
              </div>
              <div>
                <h2>Échanges en attente de réponse</h2>
                <div className="sous">
                  Triés par échéance, du plus urgent au moins urgent
                </div>
              </div>
            </div>

            <div className="enveloppe-tableau">
              <table>
                <thead>
                  <tr>
                    <th>Sujet</th>
                    <th>Expéditeur</th>
                    <th>Catégorie</th>
                    <th>Responsable</th>
                    <th>Échéance</th>
                    <th>Relance</th>
                    <th>Statut</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {d.echanges.length === 0 && (
                    <tr>
                      <td colSpan={8}>
                        <div className="vide">
                          Aucun échange en attente.
                        </div>
                      </td>
                    </tr>
                  )}
                  {d.echanges.map((e) => {
                    const p = pastilleStatut(e.statut, e.echeance, now);
                    const heures = (now.getTime() - e.recuLe.getTime()) / 3600000;
                    const chaleur =
                      e.echeance && e.echeance < now
                        ? "chaud"
                        : heures > 24
                          ? "tiede"
                          : "froid";
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
                          {e.categorie ? (
                            <span className="pastille" style={{ background: e.categorie.couleur + "20", color: e.categorie.couleur }}>
                              {e.categorie.libelle}
                            </span>
                          ) : (
                            <span className="resp vide">à définir</span>
                          )}
                        </td>
                        <td>
                          {e.responsable ? (
                            <div className="resp">
                              <span className="avatar s">{e.responsable.initiales ?? "?"}</span>
                              <span className="nom">{e.responsable.nomComplet.split(" ")[0]}</span>
                            </div>
                          ) : (
                            <span className="resp vide">à attribuer</span>
                          )}
                        </td>
                        <td>
                          <span className={`attente ${chaleur} tnum`}>
                            <IconeHorloge />
                            {attente(e.recuLe, now)}
                          </span>
                          {e.echeance && (
                            <div className="relance-heure tnum">
                              {echeanceLisible(e.echeance, now)}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="relance-date tnum">
                            {echeanceLisible(e.prochaineRelanceLe, now)}
                          </div>
                          <div className="relance-heure">
                            {e.nbRelances > 0
                              ? `${e.nbRelances} relance${e.nbRelances > 1 ? "s" : ""}`
                              : "aucune"}
                          </div>
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
                            <button
                              className="mini"
                              popoverTarget={`m-${e.id}`}
                              aria-label="Actions sur cet échange"
                              title="Actions"
                              type="button"
                            >
                              <IconePoints />
                            </button>
                          </div>
                          <MenuActions ligne={e} donnees={d} />
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

/* ── Menu d'actions ─────────────────────────────────────────────────── */

function MenuActions({ ligne, donnees }: { ligne: any; donnees: any }) {
  const possibles = transitionsPossibles(ligne.statut as Statut);
  const id = `m-${ligne.id}`;

  return (
    <div id={id} popover="auto" className="popover">
      <div className="popover-tete">
        <div className="popover-sujet">{ligne.sujet}</div>
        <div className="popover-meta">
          {ligne.correspondant.organisation ?? ligne.correspondant.email} ·{" "}
          {ligne.nbRelances} relance{ligne.nbRelances > 1 ? "s" : ""}
        </div>
        <button className="popover-fermer" popoverTarget={id} popoverTargetAction="hide" type="button" aria-label="Fermer">
          ×
        </button>
      </div>

      <div className="popover-corps">
        {possibles.includes("QUALIFIER") && (
          <form action={qualifier} className="bloc">
            <div className="bloc-titre">Qualifier et attribuer</div>
            <input type="hidden" name="echangeId" value={ligne.id} />
            <div className="champs">
              <select name="categorieId" required defaultValue="">
                <option value="" disabled>
                  Catégorie…
                </option>
                {donnees.categories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.libelle}
                  </option>
                ))}
              </select>
              <select name="responsableId" required defaultValue="">
                <option value="" disabled>
                  Responsable…
                </option>
                {donnees.utilisateurs.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nomComplet}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn primaire" type="submit">
              Mettre en suivi
            </button>
          </form>
        )}

        {possibles.includes("REATTRIBUER") && (
          <form action={reattribuer} className="bloc">
            <div className="bloc-titre">Réattribuer</div>
            <input type="hidden" name="echangeId" value={ligne.id} />
            <div className="champs">
              <select name="responsableId" required defaultValue={ligne.responsable?.id ?? ""}>
                <option value="" disabled>
                  Responsable…
                </option>
                {donnees.utilisateurs.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.nomComplet}
                  </option>
                ))}
              </select>
              <button className="btn" type="submit">
                Changer
              </button>
            </div>
          </form>
        )}

        {possibles.includes("RELANCER") && (
          <div className="bloc">
            <div className="bloc-titre">Relance</div>
            <div className="rangee">
              <form action={consignerRelance}>
                <input type="hidden" name="echangeId" value={ligne.id} />
                <button className="btn" type="submit">
                  Consigner la relance n° {ligne.nbRelances + 1}
                </button>
              </form>
              <form action={reporterRelance}>
                <input type="hidden" name="echangeId" value={ligne.id} />
                <input type="hidden" name="jours" value="1" />
                <input type="hidden" name="motif" value="Report d'un jour ouvré" />
                <button className="btn" type="submit">
                  Reporter 1 j
                </button>
              </form>
            </div>
          </div>
        )}

        {possibles.includes("ESCALADER") && (
          <form action={escalader} className="bloc">
            <div className="bloc-titre">Escalade</div>
            <input type="hidden" name="echangeId" value={ligne.id} />
            <button className="btn attention" type="submit">
              Escalader vers la hiérarchie
            </button>
          </form>
        )}

        {possibles.includes("DECLARER_REPONSE") && (
          <form action={declarerReponse} className="bloc">
            <div className="bloc-titre">Réponse obtenue hors messagerie</div>
            <input type="hidden" name="echangeId" value={ligne.id} />
            <div className="champs">
              <select name="canal" defaultValue="TELEPHONE">
                <option value="TELEPHONE">Téléphone</option>
                <option value="REUNION">Réunion</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="PHYSIQUE">En main propre</option>
              </select>
              <button className="btn succes" type="submit">
                Clôturer
              </button>
            </div>
          </form>
        )}

        {possibles.includes("CLASSER_HORS_PERIMETRE") && (
          <form action={classerHorsPerimetre} className="bloc">
            <div className="bloc-titre">Classer hors périmètre</div>
            <input type="hidden" name="echangeId" value={ligne.id} />
            <input name="motif" required placeholder="Motif (alimente la liste d'exclusion)" />
            <button className="btn" type="submit">
              Ignorer cet échange
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
