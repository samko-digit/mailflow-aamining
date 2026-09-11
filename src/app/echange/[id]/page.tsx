/**
 * MailFlow · Fiche dossier
 *
 * Vue détaillée d'un échange : informations, actions.
 */

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { DateTime } from "luxon";
import { prisma } from "../../../lib/prisma";
import { pastilleStatut, echeanceLisible, dateLongue, heure, ilYA } from "../../format";
import { transitionsPossibles, type Statut } from "../../../domaine/cycle-echange";
import {
  classerHorsPerimetre,
  consignerRelance,
  declarerReponse,
  escalader,
  qualifier,
  reattribuer,
  reporterRelance,
  classerSansSuite,
  requalifier,
} from "../../actions";
import { Sidebar } from "../../components/Sidebar";
import { chargerCompteursSidebar } from "../../../donnees/pages";
import {
  IconeHorloge,
  IconeMail,
  IconeRelance,
  IconeValide,
  IconeArchive,
  IconeEclair,
  IconeChevronGauche,
  IconeAccueil,
} from "../../icones";

export const dynamic = "force-dynamic";

export default async function FicheEchange({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const maintenant = new Date();
  const compteurs = await chargerCompteursSidebar();

  const echange = await prisma.echange.findUnique({
    where: { id },
    include: {
      correspondant: true,
      categorie: {
        include: {
          escaladeVers: true,
        },
      },
      responsable: true,
      reponsePar: true,
      relances: {
        orderBy: { envoyeeLe: "desc" },
        take: 10,
        include: {
          destinataire: true,
          modele: true,
        },
      },
      travaux: {
        where: { statut: { in: ["EN_ATTENTE", "EN_COURS"] } },
        orderBy: { executerA: "asc" },
        take: 5,
      },
      evenements: {
        orderBy: { creeLe: "desc" },
        take: 20,
        include: {
          utilisateur: true,
        },
      },
      messages: {
        orderBy: { dateMessage: "asc" },
        take: 10,
      },
    },
  });

  if (!echange) {
    notFound();
  }

  const categories = await prisma.categorie.findMany({
    where: { actif: true },
    select: { id: true, libelle: true },
  });

  const utilisateurs = await prisma.utilisateur.findMany({
    where: { actif: true },
    select: { id: true, nomComplet: true, initiales: true },
  });

  const statut = echange.statut as Statut;
  const possibles = transitionsPossibles(statut);
  const p = pastilleStatut(statut, echange.echeance, maintenant);

  // Calcul du retard si échéance dépassée
  const retard = echange.echeance && echange.echeance < maintenant
    ? Math.floor((maintenant.getTime() - echange.echeance.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Fonction pour traduire les codes d'événements en libellés lisibles
  function libelleEvenement(type: string): string {
    const libelles: Record<string, string> = {
      "MAIL_DETECTE": "Mail détecté",
      "MAIL_ENREGISTRE": "Mail enregistré",
      "MAIL_QUALIFIE": "Mail qualifié",
      "MAIL_ATTRIBUE": "Responsable attribué",
      "MAIL_TRANSMIS": "Mail transmis",
      "MAIL_REQUALIFIE": "Mail requalifié",
      "RELANCE_ENVOYEE": "Relance envoyée",
      "RELANCE_REPORTEE": "Relance reportée",
      "RELANCE_ECHEC": "Relance en échec",
      "REPONSE_DETECTEE": "Réponse détectée",
      "REPONSE_DECLAREE": "Réponse déclarée",
      "ESCALADE_DECLENCHEE": "Escalade déclenchée",
      "ECHANGE_CLOS": "Dossier clos",
      "MAIL_ARCHIVE": "Mail archivé",
      "PARAMETRE_MODIFIE": "Paramètre modifié",
      "REGLE_MODIFIEE": "Règle modifiée",
      "UTILISATEUR_MODIFIE": "Utilisateur modifié",
      "ANOMALIE_TECHNIQUE": "Anomalie technique",
    };
    return libelles[type] || type;
  }

  // Fonction pour extraire l'ordre de relance depuis le JSON charge
  function extraireOrdreRelance(charge: any): number | null {
    if (!charge || typeof charge !== 'object') return null;
    if (typeof charge.ordre === 'number') return charge.ordre;
    return null;
  }

  return (
    <div className="appli">
      <Sidebar routeActuelle="/" compteurs={compteurs} />

      {/* Zone principale */}
      <div className="principal">
        <header className="barre">
          <div className="utilisateur-barre">
            <IconeChevronGauche />
            <span>Retour au tableau de bord</span>
          </div>
        </header>

        <main className="contenu">
          <div className="entete">
            <div>
              <a href="/" className="lien" style={{ fontSize: "13px", fontWeight: "500" }}>
                ← Retour aux emails
              </a>
              <h1 style={{ marginTop: "12px", fontSize: "24px", fontWeight: "600", lineHeight: "1.3" }}>{echange.sujet}</h1>
              <p className="sous" style={{ marginTop: "8px" }}>
                {echange.correspondant.email} · {echange.correspondant.organisation ?? "—"}
              </p>
              <p className="sous" style={{ marginTop: "4px", fontSize: "13px", color: "var(--encre-2)" }}>
                Reçu le {dateLongue(echange.recuLe)} à {heure(echange.recuLe)}
              </p>
            </div>
            <div className="statut-pastille">
              <span className={`pastille ${p.classe}`}>{p.libelle}</span>
              {echange.webLink && (
                <a 
                  href={echange.webLink} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn primaire" 
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", marginTop: "12px", fontSize: "13px" }}
                >
                  <IconeMail />
                  Voir dans Outlook
                </a>
              )}
            </div>
          </div>

          {/* Informations synthétiques */}
          <div className="synthese-badges" style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
            <span className={`pastille ${p.classe}`}>{p.libelle}</span>
            {echange.categorie && (
              <span className="pastille" style={{ background: echange.categorie.couleur + "20", color: echange.categorie.couleur }}>
                {echange.categorie.libelle}
              </span>
            )}
            {echange.responsable && (
              <span className="pastille past-bleu">
                {echange.responsable.nomComplet}
              </span>
            )}
          </div>

          <div className="grille">
            <div className="colonne">
              {/* Résumé du dossier */}
              <section className="carte">
                <div className="carte-tete">
                  <div className="picto r-bleu">
                    <IconeMail />
                  </div>
                  <h2>Résumé du dossier</h2>
                </div>
                <div className="carte-corps infos">
                  <div className="info-ligne">
                    <span className="label">Statut</span>
                    <span className={`pastille ${p.classe}`}>{p.libelle}</span>
                  </div>
                  <div className="info-ligne">
                    <span className="label">Catégorie</span>
                    <span>
                      {echange.categorie ? (
                        <span className="pastille" style={{ background: echange.categorie.couleur + "20", color: echange.categorie.couleur }}>
                          {echange.categorie.libelle}
                        </span>
                      ) : (
                        "Non catégorisé"
                      )}
                    </span>
                  </div>
                  <div className="info-ligne">
                    <span className="label">Responsable</span>
                    <span>
                      {echange.responsable ? (
                        <div className="resp">
                          <span className="avatar s">{echange.responsable.initiales ?? "?"}</span>
                          <span className="nom">{echange.responsable.nomComplet}</span>
                        </div>
                      ) : (
                        "Non attribué"
                      )}
                    </span>
                  </div>
                  <div className="info-ligne">
                    <span className="label">Date de réception</span>
                    <span className="tnum">
                      {dateLongue(echange.recuLe)} à {heure(echange.recuLe)}
                    </span>
                  </div>
                  <div className="info-ligne">
                    <span className="label">Échéance</span>
                    <div>
                      <span className="tnum">
                        {echange.echeance ? echeanceLisible(echange.echeance, maintenant) : "Non définie"}
                      </span>
                      {retard !== null && (
                        <div style={{ color: "var(--rouge)", fontSize: "12px", marginTop: "4px" }}>
                          ⚠ En retard de {retard} jour{retard > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="info-ligne">
                    <span className="label">Relances</span>
                    <span className="tnum">{echange.nbRelances} relance{echange.nbRelances > 1 ? "s" : ""}</span>
                  </div>
                  {echange.aPieceJointe && (
                    <div className="info-ligne">
                      <span className="label">📎</span>
                      <span>Pièce jointe disponible</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Messages */}
              <section className="carte">
                <div className="carte-tete">
                  <div className="picto r-bleu">
                    <IconeMail />
                  </div>
                  <h2>Messages</h2>
                </div>
                <div className="carte-corps">
                  {echange.messages.length === 0 && (
                    <div className="vide">
                      Le contenu du message n'est pas disponible dans MailFlow.
                      {echange.webLink && (
                        <>
                          {" "}
                          <a href={echange.webLink} target="_blank" rel="noreferrer" className="lien">
                            Voir dans Outlook
                          </a>
                        </>
                      )}
                    </div>
                  )}
                  {echange.messages.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {echange.messages.map((msg) => (
                        <div key={msg.id} className="message-ligne" style={{ 
                          padding: "12px", 
                          background: msg.sens === "SORTANT" ? "var(--bleu-clair)" : "var(--gris-clair)",
                          borderRadius: "8px",
                          borderLeft: msg.sens === "SORTANT" ? "3px solid var(--bleu)" : "3px solid var(--vert)"
                        }}>
                          <div className="message-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span className={`pastille ${msg.sens === "SORTANT" ? "past-bleu" : "past-vert"}`} style={{ fontSize: "11px" }}>
                                {msg.sens === "SORTANT" ? "↗ Sortant" : "↙ Entrant"}
                              </span>
                              <span className="message-exp" style={{ fontWeight: "500" }}>{msg.expediteur}</span>
                            </div>
                            <span className="message-date tnum" style={{ fontSize: "12px", color: "var(--encre-2)" }}>
                              {dateLongue(msg.dateMessage)} à {heure(msg.dateMessage)}
                            </span>
                          </div>
                          <div className="message-sujet" style={{ fontWeight: "600", marginBottom: "4px" }}>{msg.sujet}</div>
                          {msg.destinataires && msg.destinataires.length > 0 && (
                            <div style={{ fontSize: "12px", color: "var(--encre-2)", marginBottom: "4px" }}>
                              Destinataires: {msg.destinataires.join(", ")}
                            </div>
                          )}
                          {msg.extrait && (
                            <div className="message-extrait" style={{ marginTop: "8px", color: "var(--encre-2)", fontSize: "13px", lineHeight: "1.4" }}>
                              {msg.extrait}
                            </div>
                          )}
                          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            {msg.estAutomatique && (
                              <span className="pastille past-gris" style={{ fontSize: "11px" }}>
                                Réponse automatique
                              </span>
                            )}
                            {msg.estNonRemise && (
                              <span className="pastille past-rouge" style={{ fontSize: "11px" }}>
                                Rapport de non-remise
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Travaux */}
              {echange.travaux.length > 0 && (
                <section className="carte">
                  <div className="carte-tete">
                    <div className="picto r-jaune">
                      <IconeHorloge />
                    </div>
                    <h2>Travaux en cours</h2>
                  </div>
                  <div className="carte-corps">
                    {echange.travaux.map((t) => {
                      const ordreRelance = extraireOrdreRelance(t.charge);
                      const estEnRetard = t.executerA < maintenant;
                      const retardTravail = estEnRetard 
                        ? Math.floor((maintenant.getTime() - t.executerA.getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      
                      return (
                        <div key={t.id} className="travail-ligne" style={{ 
                          padding: "12px", 
                          background: "var(--gris-clair)", 
                          borderRadius: "8px",
                          marginBottom: "8px"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                            <div>
                              <div className="travail-type" style={{ fontWeight: "600", fontSize: "14px" }}>{t.type}</div>
                              {ordreRelance && (
                                <div style={{ fontSize: "12px", color: "var(--encre-2)", marginTop: "2px" }}>
                                  Relance n°{ordreRelance}
                                </div>
                              )}
                            </div>
                            <div className="travail-statut">
                              <span className={`pastille ${t.statut === "EN_ATTENTE" ? "past-jaune" : "past-bleu"}`} style={{ fontSize: "11px" }}>
                                {t.statut}
                              </span>
                            </div>
                          </div>
                          <div className="travail-echeance tnum" style={{ fontSize: "13px" }}>
                            Échéance: {echeanceLisible(t.executerA, maintenant)}
                            {retardTravail !== null && (
                              <span style={{ color: "var(--rouge)", marginLeft: "8px", fontSize: "12px" }}>
                                ⚠ En retard de {retardTravail} jour{retardTravail > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Réponse */}
              <section className="carte">
                <div className="carte-tete">
                  <div className="picto r-vert">
                    <IconeValide />
                  </div>
                  <h2>Réponse</h2>
                </div>
                <div className="carte-corps infos">
                  {echange.reponduLe ? (
                    <>
                      <div className="info-ligne">
                        <span className="label">Date de réponse</span>
                        <span className="tnum">
                          {dateLongue(echange.reponduLe)} à {heure(echange.reponduLe)}
                        </span>
                      </div>
                      <div className="info-ligne">
                        <span className="label">Canal</span>
                        <span className={`pastille ${echange.canalReponse ? "past-bleu" : "past-vert"}`}>
                          {echange.canalReponse || "Mail"}
                        </span>
                      </div>
                      {echange.reponsePar && (
                        <div className="info-ligne">
                          <span className="label">Répondu par</span>
                          <span>{echange.reponsePar.nomComplet}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="vide">Aucune réponse reçue.</div>
                  )}
                </div>
              </section>

              {/* Actions */}
              <section className="carte">
                <div className="carte-tete">
                  <div className="picto r-violet">
                    <IconeEclair />
                  </div>
                  <h2>Actions disponibles</h2>
                </div>
                <div className="carte-corps actions-dispo">
                  {possibles.includes("QUALIFIER") && (
                    <form action={qualifier} className="action-form">
                      <div className="bloc-titre" style={{ fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--encre-3)", fontWeight: "700", marginBottom: "8px" }}>
                        Qualification requise
                      </div>
                      <input type="hidden" name="echangeId" value={echange.id} />
                      <div className="champs">
                        <select name="categorieId" required defaultValue="">
                          <option value="" disabled>
                            Catégorie…
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.libelle}
                            </option>
                          ))}
                        </select>
                        <select name="responsableId" required defaultValue="">
                          <option value="" disabled>
                            Responsable…
                          </option>
                          {utilisateurs.map((u) => (
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
                    <form action={reattribuer} className="action-form">
                      <input type="hidden" name="echangeId" value={echange.id} />
                      <select name="responsableId" required defaultValue={echange.responsable?.id ?? ""}>
                        <option value="" disabled>
                          Responsable…
                        </option>
                        {utilisateurs.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.nomComplet}
                          </option>
                        ))}
                      </select>
                      <button className="btn" type="submit">
                        Réattribuer
                      </button>
                    </form>
                  )}

                  {possibles.includes("REQUALIFIER") && (
                    <form action={requalifier} className="action-form">
                      <div className="bloc-titre" style={{ fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--encre-3)", fontWeight: "700", marginBottom: "8px" }}>
                        Requalification
                      </div>
                      <div className="requalification-info">
                        <div style={{ fontSize: "12px", color: "var(--encre-2)", marginBottom: "8px" }}>
                          Vous êtes sur le point de modifier la qualification actuelle de cet échange.
                        </div>
                        <div className="requalification-avant">
                          <span className="label">Qualification actuelle</span>
                          <span>Catégorie : {echange.categorie?.libelle || "—"}</span>
                          <span>Responsable : {echange.responsable?.nomComplet || "—"}</span>
                        </div>
                      </div>
                      <div className="bloc-titre" style={{ fontSize: "11px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--encre-3)", fontWeight: "700", marginBottom: "8px", marginTop: "12px" }}>
                        Nouvelle qualification
                      </div>
                      <div className="champs">
                        <select name="categorieId" required defaultValue={echange.categorieId ?? ""}>
                          <option value="" disabled>
                            Nouvelle catégorie…
                          </option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.libelle}
                            </option>
                          ))}
                        </select>
                        <select name="responsableId" required defaultValue={echange.responsableId ?? ""}>
                          <option value="" disabled>
                            Nouveau responsable…
                          </option>
                          {utilisateurs.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nomComplet}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button className="btn attention" type="submit">
                        Confirmer la requalification
                      </button>
                    </form>
                  )}

                  {possibles.includes("RELANCER") && (
                    <div className="action-group">
                      <form action={consignerRelance}>
                        <input type="hidden" name="echangeId" value={echange.id} />
                        <button className="btn" type="submit">
                          Consigner la relance n° {echange.nbRelances + 1}
                        </button>
                      </form>
                      <form action={reporterRelance}>
                        <input type="hidden" name="echangeId" value={echange.id} />
                        <input type="hidden" name="jours" value="1" />
                        <input type="hidden" name="motif" value="Report d'un jour ouvré" />
                        <button className="btn" type="submit">
                          Reporter 1 j
                        </button>
                      </form>
                    </div>
                  )}

                  {possibles.includes("DECLARER_REPONSE") && (
                    <form action={declarerReponse} className="action-form">
                      <input type="hidden" name="echangeId" value={echange.id} />
                      <select name="canal" defaultValue="TELEPHONE">
                        <option value="TELEPHONE">Téléphone</option>
                        <option value="REUNION">Réunion</option>
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="PHYSIQUE">En main propre</option>
                      </select>
                      <button className="btn succes" type="submit">
                        Déclarer réponse
                      </button>
                    </form>
                  )}

                  {possibles.includes("ESCALADER") && (
                    <form action={escalader} className="action-form">
                      <input type="hidden" name="echangeId" value={echange.id} />
                      {!echange.categorie?.escaladeVers && (
                        <div className="erreur-action">
                          Impossible d'escalader : aucun destinataire configuré pour cette catégorie.
                        </div>
                      )}
                      <button 
                        className="btn attention" 
                        type="submit" 
                        disabled={!echange.categorie?.escaladeVers}
                      >
                        Escalader vers la hiérarchie
                      </button>
                    </form>
                  )}

                  {possibles.includes("CLASSER_SANS_SUITE") && (
                    <form action={classerSansSuite} className="action-form">
                      <input type="hidden" name="echangeId" value={echange.id} />
                      <input name="motif" required placeholder="Motif obligatoire" />
                      <button className="btn danger" type="submit">
                        Classer sans suite
                      </button>
                    </form>
                  )}

                  {possibles.includes("CLASSER_HORS_PERIMETRE") && (
                    <form action={classerHorsPerimetre} className="action-form">
                      <input type="hidden" name="echangeId" value={echange.id} />
                      <input name="motif" required placeholder="Motif (alimente l'exclusion)" />
                      <button className="btn danger" type="submit">
                        Classer hors périmètre
                      </button>
                    </form>
                  )}

                  {possibles.length === 0 && (
                    <div className="vide">
                      Aucune action disponible dans cet état terminal.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="colonne">
              {/* Historique */}
              <section className="carte">
                <div className="carte-tete">
                  <div className="picto r-bleu">
                    <IconeEclair />
                  </div>
                  <h2>Historique</h2>
                </div>
                <div className="carte-corps activite">
                  {echange.evenements.length === 0 && (
                    <div className="vide">Aucun événement enregistré.</div>
                  )}
                  {echange.evenements.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {echange.evenements.map((ev) => (
                        <div key={ev.id} style={{ 
                          display: "flex", 
                          gap: "12px",
                          padding: "12px",
                          background: "var(--gris-clair)",
                          borderRadius: "8px"
                        }}>
                          <div className="activite-icone" style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center",
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "var(--bleu-clair)",
                            color: "var(--bleu)"
                          }}>
                            {ev.type === "MAIL_QUALIFIE" && <IconeValide />}
                            {ev.type === "MAIL_ATTRIBUE" && <IconeRelance />}
                            {ev.type === "MAIL_REQUALIFIE" && <IconeEclair />}
                            {ev.type === "MAIL_ARCHIVE" && <IconeArchive />}
                            {ev.type === "RELANCE_ENVOYEE" && <IconeRelance />}
                            {ev.type === "ESCALADE_DECLENCHEE" && <IconeEclair />}
                            {ev.type === "REPONSE_DECLAREE" && <IconeValide />}
                            {ev.type === "REPONSE_DETECTEE" && <IconeValide />}
                            {ev.type === "MAIL_DETECTE" && <IconeMail />}
                            {ev.type === "MAIL_ENREGISTRE" && <IconeMail />}
                            {!["MAIL_QUALIFIE", "MAIL_ATTRIBUE", "MAIL_REQUALIFIE", "MAIL_ARCHIVE", "RELANCE_ENVOYEE", "ESCALADE_DECLENCHEE", "REPONSE_DECLAREE", "REPONSE_DETECTEE", "MAIL_DETECTE", "MAIL_ENREGISTRE"].includes(ev.type) && (
                              <IconeEclair />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="titre" style={{ fontWeight: "600", marginBottom: "4px" }}>{libelleEvenement(ev.type)}</div>
                            {ev.libelle && (
                              <div className="detail" style={{ fontSize: "13px", color: "var(--encre-2)", marginBottom: "4px" }}>{ev.libelle}</div>
                            )}
                            <div className="quand" style={{ fontSize: "12px", color: "var(--encre-3)" }}>
                              {ilYA(ev.creeLe, maintenant)}
                              {ev.utilisateur && (
                                <span style={{ marginLeft: "8px" }}>
                                  par {ev.utilisateur.nomComplet}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
