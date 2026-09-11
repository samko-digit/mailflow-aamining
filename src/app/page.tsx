/**
 * MailFlow · Tableau de bord
 *
 * Composant serveur : les données viennent directement de PostgreSQL au
 * rendu, en une seule salve de requêtes. Aucune API intermédiaire, aucun
 * chargement côté navigateur, donc aucun écran vide au premier affichage.
 *
 * Les actions passent par des formulaires et des actions serveur. Les gestes
 * proposés à l'utilisateur sont exactement ceux que le domaine autorise
 * depuis l'état courant : `transitionsPossibles` gouverne le menu, ce qui
 * évite d'offrir un bouton que la machine refuserait.
 */

import {
  classerHorsPerimetre,
  classerHorsPerimetreEnLotAction,
  classerSansSuite,
  consignerRelance,
  declarerReponse,
  escalader,
  qualifier,
  qualifierEnLotAction,
  reattribuer,
  reporterRelance,
} from "./actions";
import { type Statut, transitionsPossibles } from "../domaine/cycle-echange";
import { chargerTableauDeBord } from "../donnees/tableau-de-bord";
import { chargerCompteursSidebar } from "../donnees/pages";
import { prisma } from "../lib/prisma";

async function utilisateurCourant() {
  const u = await prisma.utilisateur.findFirst({
    where: { role: "ADMINISTRATEUR", actif: true },
    select: { nomComplet: true, role: true, initiales: true },
  });
  return u || { nomComplet: "Utilisateur", role: "LECTEUR", initiales: "?" };
}
import {
  attente,
  classeEvenement,
  couleurPriorite,
  dansCombienDeTemps,
  dateLongue,
  echeanceLisible,
  heure,
  ilYA,
  libelleEvenement,
  pastilleStatut,
} from "./format";
import { Sidebar } from "./components/Sidebar";
import {
  IconeAlerte,
  IconeArchive,
  IconeCalendrier,
  IconeCamembert,
  IconeChevronBas,
  IconeChevronDroite,
  IconeChevronGauche,
  IconeCoche,
  IconeEclair,
  IconeEquipe,
  IconeHorloge,
  IconeMail,
  IconeOeil,
  IconePoints,
  IconePouls,
  IconeRecherche,
  IconeRelance,
  IconeRobot,
  IconeSoleil,
  IconeValide,
} from "./icones";

export const dynamic = "force-dynamic";

type Donnees = Awaited<ReturnType<typeof chargerTableauDeBord>>;
type Ligne = Donnees["aTraiter"][number];

export default async function TableauDeBord({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const d = await chargerTableauDeBord(q);
  const compteurs = await chargerCompteursSidebar();
  const utilisateur = await utilisateurCourant();
  const now = d.maintenant;
  const total = d.repartition.reduce((s, r) => s + r.nombre, 0) || 1;

  return (
    <div className="appli">
      <Sidebar routeActuelle="/" compteurs={compteurs} />

      {/* ── Zone principale ─────────────────────────────────────────── */}
      <div className="principal">
        <header className="barre">
          <form className="recherche" action="/" method="get" role="search">
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

          <div className="actions">
            <button className="bouton-icone" aria-label="Thème" type="button">
              <IconeSoleil />
            </button>
            <div className="utilisateur-barre">
              <div className="avatar">{utilisateur.initiales}</div>
              <div>
                <div className="nom">{utilisateur.nomComplet}</div>
                <div className="role">{utilisateur.role}</div>
              </div>
              <IconeChevronBas />
            </div>
          </div>
        </header>

        <main className="contenu">
          <div className="entete">
            <div>
              <h1>Bonjour, {utilisateur.nomComplet.split(" ")[0]}</h1>
              <p className="sous">
                Voici l&apos;état du suivi des e-mails aujourd&apos;hui.
              </p>
            </div>
            <div className="pave-date">
              <IconeCalendrier />
              <div>
                <div className="jour">{dateLongue(now)}</div>
                <div className="heure tnum">{heure(now)}</div>
              </div>
            </div>
          </div>

          <section className="indicateurs">
            <Kpi rond="r-bleu" icone={<IconeMail />} titre="Mails suivis" valeur={d.indicateurs.totalSuivis} note="depuis la mise en service" />
            <Kpi rond="r-jaune" icone={<IconeHorloge />} titre="En attente" valeur={d.indicateurs.enAttente} note="réponse attendue" />
            <Kpi rond="r-rouge" icone={<IconeAlerte />} titre="En retard" valeur={d.indicateurs.enRetard} note="échéance dépassée" />
            <Kpi rond="r-violet" icone={<IconeRelance />} titre="Relances aujourd'hui" valeur={d.indicateurs.relancesDuJour} note="consignées" />
            <Kpi rond="r-vert" icone={<IconeValide />} titre="Réponses détectées" valeur={d.indicateurs.reponsesDuJour} note="aujourd'hui" />
          </section>

          <div className="grille">
            <div className="colonne">
              <section className="carte">
                <div className="carte-tete">
                  <div className={`picto ${d.enRecherche ? "r-bleu" : "r-rouge"}`}>
                    {d.enRecherche ? <IconeRecherche /> : <IconeAlerte />}
                  </div>
                  <div>
                    <h2>
                      {d.enRecherche
                        ? `Résultats pour « ${d.recherche} »`
                        : "À traiter maintenant"}
                    </h2>
                    <div className="sous">
                      {d.enRecherche
                        ? "Un nombre seul désigne un numéro d'échange. Sinon : objet, extrait et correspondant, tous états confondus."
                        : "Les e-mails qui nécessitent une action, du plus urgent au moins urgent."}
                    </div>
                  </div>
                  {d.enRecherche ? (
                    <a href="/" className="lien">
                      Effacer la recherche
                    </a>
                  ) : (
                    <span className="lien" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                      Voir tous →
                    </span>
                  )}
                </div>

                <div className="enveloppe-tableau">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: "40px" }}>
                          <input
                            type="checkbox"
                            id="select-all"
                          />
                        </th>
                        <th>Sujet</th>
                        <th>Expéditeur</th>
                        <th>Responsable</th>
                        <th>Attente</th>
                        <th>Relance</th>
                        <th>Statut</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.aTraiter.length === 0 && (
                        <tr>
                          <td colSpan={7}>
                            <div className="vide">
                              Aucun échange ne correspond.
                            </div>
                          </td>
                        </tr>
                      )}
                      {d.aTraiter.map((e) => {
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
                              <input
                                type="checkbox"
                                className="row-checkbox"
                                data-id={e.id}
                                disabled={e.statut !== "A_QUALIFIER"}
                              />
                            </td>
                            <td>
                              <div className="cellule-sujet">
                                <span className="liseré" style={{ background: couleurPriorite(e.priorite) }} />
                                <div>
                                  <a href={`/echange/${e.id}`} className="sujet-titre">
                                    {e.sujet}
                                    {e.aPieceJointe && <IconeTromboneInline />}
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
                                <span className="resp vide">à attribuer</span>
                              )}
                            </td>
                            <td>
                              <span className={`attente ${chaleur} tnum`}>
                                <IconeHorloge />
                                {attente(e.recuLe, now)}
                              </span>
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

                <FormulaireLot donnees={d} />

                <div className="pied-tableau">
                  <span>
                    {d.aTraiter.length} affiché{d.aTraiter.length > 1 ? "s" : ""}
                    {!d.enRecherche &&
                      ` sur ${d.indicateurs.totalSuivis - d.menu.repondus} actifs`}
                  </span>
                  <div className="droite">
                    <span className="tnum">1 à {d.aTraiter.length}</span>
                    <button className="mini" aria-label="Page précédente" type="button">
                      <IconeChevronGauche />
                    </button>
                    <button className="mini" aria-label="Page suivante" type="button">
                      <IconeChevronDroite />
                    </button>
                  </div>
                </div>
              </section>

              <div className="duo">
                <section className="carte">
                  <div className="carte-tete">
                    <div className="picto r-bleu">
                      <IconeEquipe />
                    </div>
                    <h2>Mails par responsable</h2>
                  </div>
                  <div className="carte-corps charge">
                    {d.charge.map((c) => {
                      const pct = Math.round((c.nombre / (d.totalCharge || 1)) * 100);
                      return (
                        <div className="charge-ligne" key={c.id}>
                          <span className="avatar s">{c.initiales}</span>
                          <span className="nom">{c.nom}</span>
                          <span className="nb tnum">{c.nombre}</span>
                          <span className="jauge">
                            <span
                              style={{
                                width: `${Math.max(pct, 4)}%`,
                                background: c.id === "aucun" ? "var(--gris-plein)" : "var(--bleu)",
                              }}
                            />
                          </span>
                          <span className="pct tnum">{pct} %</span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className="carte">
                  <div className="carte-tete">
                    <div className="picto r-violet">
                      <IconeCamembert />
                    </div>
                    <h2>Répartition des statuts</h2>
                  </div>
                  <div className="carte-corps repartition">
                    <Beignet
                      parts={d.repartition.map((r) => ({ valeur: r.nombre, couleur: r.couleur }))}
                      total={total}
                    />
                    <div className="legende">
                      {d.repartition.map((r) => (
                        <div className="legende-ligne" key={r.cle}>
                          <span className="puce" style={{ background: r.couleur }} />
                          <span>{r.libelle}</span>
                          <span className="nb tnum">{r.nombre}</span>
                          <span className="pct tnum">{Math.round((r.nombre / total) * 100)} %</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <div className="bandeau">
                <div className="picto">
                  <IconeRobot />
                </div>
                <div>
                  <div className="titre">L&apos;automatisation travaille pour vous</div>
                  <div className="texte">
                    Le moteur capte les courriels 7 j/7, détecte les réponses et
                    relance aux heures ouvrées seulement.
                  </div>
                </div>
                <span className="bouton" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                  Voir comment ça marche
                </span>
              </div>
            </div>

            <div className="colonne">
              <section className="carte">
                <div className="carte-tete">
                  <div className="picto r-bleu">
                    <IconePouls />
                  </div>
                  <h2>Activité récente</h2>
                  <span className="lien" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                    Voir tout
                  </span>
                </div>
                <div className="carte-corps activite">
                  {d.evenements.length === 0 && (
                    <div className="vide">Aucune activité enregistrée.</div>
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
                        <div className="quand">{ilYA(ev.creeLe, now)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="carte">
                <div className="carte-tete">
                  <div className="picto r-jaune">
                    <IconeCalendrier />
                  </div>
                  <h2>Prochaine relance</h2>
                </div>
                <div className="carte-corps">
                  {d.prochaineRelance?.prochaineRelanceLe ? (
                    <div className="prochaine">
                      <div className="haut">
                        <div className="picto">
                          <IconeRelance />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="sujet">{d.prochaineRelance.sujet}</div>
                          <div className="org">
                            {d.prochaineRelance.correspondant.organisation ?? "—"}
                            {d.prochaineRelance.responsable
                              ? ` · ${d.prochaineRelance.responsable.nomComplet}`
                              : ""}
                          </div>
                        </div>
                        <span className="delai">
                          {dansCombienDeTemps(d.prochaineRelance.prochaineRelanceLe, now)}
                        </span>
                      </div>
                      <div className="bas">
                        <span className="date tnum">
                          {echeanceLisible(d.prochaineRelance.prochaineRelanceLe, now)}
                        </span>
                        <form action={reporterRelance}>
                          <input type="hidden" name="echangeId" value={d.prochaineRelance.id} />
                          <input type="hidden" name="jours" value="1" />
                          <input type="hidden" name="motif" value="Report depuis le tableau de bord" />
                          <button className="bouton" type="submit">
                            <IconeHorloge /> Reporter d&apos;un jour
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="vide">Aucune relance programmée.</div>
                  )}
                </div>
              </section>

              <section className="carte">
                <div className="carte-tete">
                  <div className="picto r-violet">
                    <IconeEclair />
                  </div>
                  <h2>Automatisation</h2>
                  <span className="lien" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                    Voir détails
                  </span>
                </div>
                <div className="carte-corps etapes">
                  <Etape etat="fait" libelle="Mail détecté" />
                  <Etape etat="fait" libelle="Mail enregistré" />
                  <Etape
                    etat={d.prochaineRelance ? "fait" : "avenir"}
                    libelle="Responsable identifié"
                    precision={d.prochaineRelance?.responsable?.nomComplet}
                  />
                  <Etape
                    etat="encours"
                    libelle="Attente de réponse"
                    precision={
                      d.prochainTravail
                        ? `Prochaine vérification : ${echeanceLisible(d.prochainTravail.executerA, now)}`
                        : undefined
                    }
                  />
                  <Etape
                    etat="avenir"
                    libelle="Relance si aucune réponse"
                    precision={
                      d.prochaineRelance?.prochaineRelanceLe
                        ? echeanceLisible(d.prochaineRelance.prochaineRelanceLe, now)
                        : undefined
                    }
                  />
                  <Etape etat="avenir" libelle="Arrêt automatique à la réponse" />
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Formulaire de qualification en lot ───────────────────────────────── */

/**
 * Formulaire client pour la qualification en lot.
 *
 * Apparaît quand des lignes A_QUALIFIER sont cochées. Permet d'appliquer
 * la même catégorie et le même responsable à plusieurs échanges d'un coup.
 */
function FormulaireLot({ donnees }: { donnees: Donnees }) {
  return (
    <>
      <form
        action={qualifierEnLotAction}
        className="formulaire-lot"
        style={{ display: "none" }}
        id="batch-form"
      >
        <input type="hidden" name="echangeIds" id="selected-ids" />
        <div className="lot-barre">
          <span className="lot-info">
            <IconeCoche />
            <span id="selected-count">0</span> sélectionné(s)
          </span>
          <div className="lot-actions">
            <select name="categorieId" required defaultValue="">
              <option value="" disabled>
                Catégorie…
              </option>
              {donnees.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.libelle}
                </option>
              ))}
            </select>
            <select name="responsableId" required defaultValue="">
              <option value="" disabled>
                Responsable…
              </option>
              {donnees.utilisateurs.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nomComplet}
                </option>
              ))}
            </select>
            <button className="btn primaire" type="submit">
              Qualifier la sélection
            </button>
            <button
              className="btn"
              type="button"
              id="cancel-batch"
            >
              Annuler
            </button>
          </div>
        </div>
      </form>

      <form
        action={classerHorsPerimetreEnLotAction}
        className="formulaire-lot"
        style={{ display: "none" }}
        id="batch-form-hp"
      >
        <input type="hidden" name="echangeIds" id="selected-ids-hp" />
        <div className="lot-barre">
          <span className="lot-info">
            <IconeCoche />
            <span id="selected-count-hp">0</span> sélectionné(s)
          </span>
          <div className="lot-actions">
            <input
              name="motif"
              required
              placeholder="Motif (alimente l'exclusion)"
              style={{ width: "200px" }}
            />
            <button className="btn danger" type="submit">
              Ignorer la sélection
            </button>
            <button
              className="btn"
              type="button"
              id="cancel-batch-hp"
            >
              Annuler
            </button>
          </div>
        </div>
      </form>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Gestion de l'affichage du formulaire de lot
            const checkboxes = document.querySelectorAll('.row-checkbox');
            const batchForm = document.getElementById('batch-form');
            const batchFormHp = document.getElementById('batch-form-hp');
            const selectedIdsInput = document.getElementById('selected-ids');
            const selectedIdsHpInput = document.getElementById('selected-ids-hp');
            const selectedCount = document.getElementById('selected-count');
            const selectedCountHp = document.getElementById('selected-count-hp');
            const selectAll = document.getElementById('select-all');
            const cancelBatch = document.getElementById('cancel-batch');
            const cancelBatchHp = document.getElementById('cancel-batch-hp');

            function updateBatchForm() {
              const selected = Array.from(checkboxes)
                .filter(cb => cb.checked && !cb.disabled)
                .map(cb => cb.getAttribute('data-id'));

              if (selected.length > 0) {
                batchForm.style.display = 'block';
                batchFormHp.style.display = 'block';
                selectedIdsInput.value = selected.join(',');
                selectedIdsHpInput.value = selected.join(',');
                selectedCount.textContent = selected.length;
                selectedCountHp.textContent = selected.length;
              } else {
                batchForm.style.display = 'none';
                batchFormHp.style.display = 'none';
              }
            }

            checkboxes.forEach(cb => {
              cb.addEventListener('change', updateBatchForm);
            });

            selectAll.addEventListener('change', (e) => {
              const target = e.target;
              checkboxes.forEach(cb => {
                if (!cb.disabled) cb.checked = target.checked;
              });
              updateBatchForm();
            });

            cancelBatch.addEventListener('click', () => {
              checkboxes.forEach(cb => cb.checked = false);
              if (selectAll) selectAll.checked = false;
              updateBatchForm();
            });

            cancelBatchHp.addEventListener('click', () => {
              checkboxes.forEach(cb => cb.checked = false);
              if (selectAll) selectAll.checked = false;
              updateBatchForm();
            });
          `,
        }}
      />
    </>
  );
}

/* ── Menu d'actions ─────────────────────────────────────────────────── */

/**
 * Le menu n'offre que les transitions que le domaine accepte depuis l'état
 * courant. Un bouton affiché est donc un bouton qui marche.
 */
function MenuActions({ ligne, donnees }: { ligne: Ligne; donnees: Donnees }) {
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
                {donnees.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.libelle}
                  </option>
                ))}
              </select>
              <select name="responsableId" required defaultValue="">
                <option value="" disabled>
                  Responsable…
                </option>
                {donnees.utilisateurs.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nomComplet}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn primaire" type="submit">
              Mettre en suivi
            </button>
            <p className="aide">
              L&apos;échéance est calculée en jours ouvrés selon la catégorie.
            </p>
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

        {possibles.includes("REATTRIBUER") && (
          <form action={reattribuer} className="bloc">
            <div className="bloc-titre">Réattribuer</div>
            <input type="hidden" name="echangeId" value={ligne.id} />
            <div className="champs">
              <select name="responsableId" required defaultValue={ligne.responsable?.id ?? ""}>
                <option value="" disabled>
                  Responsable…
                </option>
                {donnees.utilisateurs.map((u) => (
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
              <form action={reporterRelance}>
                <input type="hidden" name="echangeId" value={ligne.id} />
                <input type="hidden" name="jours" value="3" />
                <input type="hidden" name="motif" value="Report de trois jours ouvrés" />
                <button className="btn" type="submit">
                  Reporter 3 j
                </button>
              </form>
            </div>
            <p className="aide">
              Consigner enregistre une relance que vous venez d&apos;envoyer
              vous-même. L&apos;envoi automatique arrivera avec le connecteur.
            </p>
          </div>
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

        {possibles.includes("ESCALADER") && (
          <form action={escalader} className="bloc">
            <div className="bloc-titre">Escalade</div>
            <input type="hidden" name="echangeId" value={ligne.id} />
            <button className="btn attention" type="submit">
              Escalader vers la hiérarchie
            </button>
          </form>
        )}

        {possibles.includes("CLASSER_SANS_SUITE") && (
          <form action={classerSansSuite} className="bloc">
            <div className="bloc-titre">Classer sans suite</div>
            <input type="hidden" name="echangeId" value={ligne.id} />
            <input name="motif" required placeholder="Motif obligatoire" />
            <button className="btn danger" type="submit">
              Clore sans réponse
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Petits composants ──────────────────────────────────────────────── */

function IconeTromboneInline() {
  return (
    <svg
      className="trombone"
      viewBox="0 0 24 24"
      width={13}
      height={13}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="pièce jointe"
    >
      <path d="M20 11.5 12.4 19a4.6 4.6 0 0 1-6.5-6.5l7.8-7.8a3.1 3.1 0 0 1 4.4 4.4l-7.7 7.7a1.6 1.6 0 0 1-2.2-2.2l7-7" />
    </svg>
  );
}

function Kpi({
  rond,
  icone,
  titre,
  valeur,
  note,
}: {
  rond: string;
  icone: React.ReactNode;
  titre: string;
  valeur: number;
  note: string;
}) {
  return (
    <article className="kpi">
      <div className="haut">
        <div className={`rond ${rond}`}>{icone}</div>
        <div className="titre">{titre}</div>
      </div>
      <div className="valeur tnum">{valeur}</div>
      <div className="note">{note}</div>
    </article>
  );
}

function Etape({
  etat,
  libelle,
  precision,
}: {
  etat: "fait" | "encours" | "avenir";
  libelle: string;
  precision?: string;
}) {
  return (
    <div className={`etape ${etat}`}>
      <span className="marque-etape">{etat === "fait" && <IconeCoche />}</span>
      <div>
        <div className="libelle">{libelle}</div>
        {precision && <div className="precision">{precision}</div>}
      </div>
    </div>
  );
}

/** Beignet en SVG : une part par statut, calculée sur la circonférence. */
function Beignet({
  parts,
  total,
}: {
  parts: { valeur: number; couleur: string }[];
  total: number;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  let cumul = 0;

  return (
    <div className="beignet">
      <svg viewBox="0 0 132 132" width="132" height="132" role="img" aria-label="Répartition des statuts">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--gris-clair)" strokeWidth="17" />
        {parts.map((p, i) => {
          const longueur = (p.valeur / total) * c;
          const decalage = -cumul;
          cumul += longueur;
          return (
            <circle
              key={i}
              cx="66"
              cy="66"
              r={r}
              fill="none"
              stroke={p.couleur}
              strokeWidth="17"
              strokeDasharray={`${longueur} ${c - longueur}`}
              strokeDashoffset={decalage}
              transform="rotate(-90 66 66)"
            />
          );
        })}
      </svg>
      <div className="centre">
        <div>
          <div className="n tnum">{total}</div>
          <div className="l">total</div>
        </div>
      </div>
    </div>
  );
}
