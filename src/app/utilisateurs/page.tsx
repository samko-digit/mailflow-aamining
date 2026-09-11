/**
 * MailFlow · Utilisateurs
 *
 * Page affichant la liste des utilisateurs (lecture seule).
 */

import { Sidebar } from "../components/Sidebar";
import { chargerUtilisateurs, chargerCompteursSidebar } from "../../donnees/pages";
import { IconeUtilisateurs, IconeRecherche } from "../icones";

export const dynamic = "force-dynamic";

export default async function Utilisateurs() {
  const d = await chargerUtilisateurs();
  const compteurs = await chargerCompteursSidebar();

  return (
    <div className="appli">
      <Sidebar routeActuelle="/utilisateurs" compteurs={compteurs} />

      <div className="principal">
        <header className="barre">
          <form className="recherche" action="/utilisateurs" method="get" role="search">
            <IconeRecherche />
            <input
              type="search"
              name="q"
              placeholder="Rechercher un utilisateur…"
              aria-label="Rechercher"
            />
            <span className="raccourci">Entrée</span>
          </form>

        </header>

        <main className="contenu">
          <div className="entete">
            <div>
              <h1>Utilisateurs</h1>
              <p className="sous">
                {d.total} utilisateur{d.total > 1 ? "s" : ""} dans le système
              </p>
            </div>
          </div>

          <section className="carte">
            <div className="carte-tete">
              <div className="picto r-bleu">
                <IconeUtilisateurs />
              </div>
              <div>
                <h2>Liste des utilisateurs</h2>
                <div className="sous">
                  Gestion des accès et des responsabilités
                </div>
              </div>
            </div>

            <div className="enveloppe-tableau">
              <table>
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Fonction</th>
                    <th>Statut</th>
                    <th>Suppléant</th>
                  </tr>
                </thead>
                <tbody>
                  {d.utilisateurs.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <div className="vide">
                          Aucun utilisateur trouvé.
                        </div>
                      </td>
                    </tr>
                  )}
                  {d.utilisateurs.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="resp">
                          <span className="avatar">{u.initiales ?? "?"}</span>
                          <span className="nom">{u.nomComplet}</span>
                        </div>
                      </td>
                      <td>
                        <div className="exp-mail">{u.email}</div>
                      </td>
                      <td>
                        <span className={`pastille ${u.actif ? "past-bleu" : "past-gris"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        {u.fonction || <span className="resp vide">—</span>}
                      </td>
                      <td>
                        {u.actif ? (
                          <span className="pastille past-vert">Actif</span>
                        ) : (
                          <span className="pastille past-gris">Inactif</span>
                        )}
                      </td>
                      <td>
                        {u.suppleant ? (
                          <div className="resp">
                            <span className="avatar s">{u.suppleant.initiales ?? "?"}</span>
                            <span className="nom">{u.suppleant.nomComplet.split(" ")[0]}</span>
                          </div>
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
                {d.utilisateurs.length} affiché{d.utilisateurs.length > 1 ? "s" : ""} sur {d.total}
              </span>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
