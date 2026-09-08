# MailFlow · Modèle de données

Version 1.0 · 6 septembre 2026
Schéma : `prisma/schema.prisma` · SQL complémentaire : `prisma/sql/`

---

## 1. Vue d'ensemble

Seize tables, réparties en quatre groupes.

| Groupe | Tables |
|---|---|
| **Personnes** | `utilisateur`, `absence`, `correspondant` |
| **Source** | `boite_suivie`, `expediteur_exclu` |
| **Paramétrage** | `categorie`, `regle_relance`, `modele_message`, `jour_ferie`, `parametre` |
| **Cœur** | `echange`, `message`, `piece_jointe`, `relance`, `travail_planifie`, `evenement` |

La note d'architecture annonçait dix tables. Les six de plus viennent toutes de l'interface : comptes et rôles, règles de relance paramétrables, modèles de message, journal d'activité, écran de paramètres. Aucune n'ajoute de complexité métier, elles rendent simplement administrable ce qui aurait sinon été codé en dur.

---

## 2. Les trois décisions structurantes

### 2.1 Une ligne par conversation, jamais par message

`echange` est le dossier de suivi, `message` en est le détail. Un fil de douze messages produit **une** ligne dans `echange` et douze dans `message`. C'est ce qui permet à la console d'afficher une liste lisible et au moteur de ne relancer qu'une fois.

L'unicité est posée sur `(boite_id, conversation_id)` et non sur `conversation_id` seul : l'identifiant de conversation est une notion **propre à une boîte**. Deux boîtes suivies peuvent porter le même fil avec deux identifiants différents, et le même identifiant peut désigner deux fils différents dans deux boîtes.

### 2.2 « En retard » n'est pas un statut

Sur la maquette, la pastille rouge « En retard » côtoie « En attente » et « Suivi ». Il serait tentant d'en faire une valeur de l'énumération. C'est un piège : le retard change tout seul au passage d'une échéance, sans qu'aucun code ne s'exécute. Un statut stocké deviendrait faux entre deux passages du moteur.

Le retard est donc **calculé** :

```
statut IN ('EN_ATTENTE','RELANCE','ESCALADE') AND echeance < now()
```

L'index partiel `echange_actif_echeance_idx` rend ce calcul gratuit. Les statuts stockés, eux, sont mutuellement exclusifs, ce qui garantit que la répartition affichée sur le tableau de bord somme bien au total.

### 2.3 Le compteur de relances est dénormalisé, et réconcilié

`echange.nb_relances` duplique une information que `relance` contient déjà. C'est délibéré : recalculer ce compteur à chaque affichage produirait une agrégation par ligne de la liste, ce qui est la première cause de lenteur d'une console de ce type.

Le contrat est le suivant :

- la table `relance` reste **la vérité** ;
- le compteur est incrémenté **dans la même transaction** que l'insertion ;
- un contrôle nocturne compare les deux et **signale** toute divergence sans la corriger silencieusement (requête fournie dans `prisma/sql/02_recherche.sql`).

On gagne la vitesse d'affichage sans perdre l'auditabilité.

---

## 3. De l'écran à la requête

Chaque élément de la maquette se lit dans une seule requête. Aucun écran n'appelle la base par ligne affichée.

| Élément de l'interface | Source |
|---|---|
| **Mails suivis** (42) | `count(echange) where statut <> 'HORS_PERIMETRE'` |
| **En attente** (12) | `statut = 'EN_ATTENTE'` |
| **En retard** (4) | états actifs et `echeance < now()` |
| **Relances aujourd'hui** (3) | `count(relance) where statut = 'ENVOYEE' and envoyee_le >= début du jour` |
| **Réponses détectées** (8) | `count(evenement) where type = 'REPONSE_DETECTEE' and cree_le >= début du jour` |
| **Répartition des statuts** | `group by statut`, une seule requête |
| **Mails par responsable** | `group by responsable_id` sur les états actifs |
| **À traiter maintenant** | états actifs, tri `echeance asc nulls first, priorite desc` |
| colonne *Sujet* et son liseré | `echange.sujet`, couleur depuis `categorie.couleur` ou `priorite` |
| colonne *Expéditeur* | `correspondant.email` et `correspondant.organisation` |
| colonne *Responsable* | `utilisateur.nom_complet` et `avatar_url` |
| colonne *Attente* (3 jours, 8 h) | `now() - recu_le`, formaté à l'affichage |
| colonne *Relance* (Aujourd'hui 09:42) | `prochaine_relance_le` |
| **Actions groupées** | une transaction, plus une ligne `evenement` par échange touché |
| **Activité récente** | `evenement order by cree_le desc limit 5` |
| **Prochaine relance** | états actifs, `prochaine_relance_le asc limit 1` |
| **Automatisation** (la liste à cocher) | `evenement` de l'échange courant, plus le prochain `travail_planifie` |
| **Recherche** (Ctrl + K) | `echange.recherche` en plein texte, plus `pg_trgm` sur le correspondant |
| **Mails en attente / Relances / Répondus** (menu) | `statut`, et `prochaine_relance_le <= fin du jour` pour Relances |
| **Archives** | `statut = 'ARCHIVE'` |
| **Utilisateurs** | `utilisateur` |
| **Règles de relance** | `categorie` et `regle_relance` |
| **Paramètres** | `parametre`, `jour_ferie`, `expediteur_exclu` |
| **Journal d'activité** | `evenement`, sans limite de date |

### Deux points à trancher sur les compteurs

1. **« Relances » dans le menu latéral affiche 4, « Relances envoyées » dans la répartition affiche 8.** Les deux ne peuvent pas désigner la même chose. Lecture proposée : le menu compte les relances **à envoyer aujourd'hui**, la répartition compte les échanges **déjà relancés et toujours sans réponse**. À confirmer.
2. **« Réponses détectées 8 » et « Répondus 8 »** portent le même nombre. Le premier est un flux (aujourd'hui), le second un stock (total). Ils coïncideront rarement en production. À confirmer aussi.

### Un manque repéré dans le schéma

La cloche de notification porte un badge à 3. Rien dans le modèle actuel ne permet de savoir **ce qu'un utilisateur donné a déjà lu**. Deux options :

- **Minimale** : ajouter `utilisateur.notifications_lues_jusqu_a` (horodatage). Le badge devient un `count(evenement)` depuis cette date. Aucune table de plus, aucun état par événement.
- **Complète** : une table `notification` avec destinataire, événement, lu ou non. Nécessaire seulement si les notifications doivent être ciblées et non simplement filtrées.

Recommandation : commencer par la minimale. Elle couvre l'usage visible sur la maquette.

---

## 4. Ce que la base garantit, et que le code ne peut pas défaire

Les règles suivantes sont posées en contraintes SQL, pas en validations applicatives. Une validation dans le code laisse toujours passer quelque chose le jour où deux traitements se chevauchent.

| Contrainte | Ce qu'elle empêche |
|---|---|
| `message.internet_message_id` unique | Le même message enregistré deux fois. La captation devient rejouable sans risque après un incident. |
| `echange(boite_id, conversation_id)` unique | Deux dossiers pour un même fil. |
| `relance(echange_id, ordre)` unique | Deux relances de même rang, donc un double envoi. |
| `relance.cle_idempotence` unique | Le rejeu d'un traitement interrompu qui renverrait la relance. |
| `travail_planifie.cle_idempotence` unique | La même échéance planifiée deux fois. |
| `echange_motif_obligatoire` | Un dossier classé sans suite sans explication. |
| `echange_reponse_datee` | Un dossier marqué répondu sans date de réponse. |

---

## 5. Ce qui n'est délibérément pas dans le schéma

- **Le corps intégral des messages.** Seul un extrait est stocké, avec un lien vers le message d'origine dans Outlook. Une base consultable par plusieurs personnes n'est pas le bon réceptacle pour de la correspondance sensible, et le corps HTML représente l'essentiel du volume pour une valeur de recherche faible.
- **Les fichiers.** `piece_jointe` porte les métadonnées et une clé ; le fichier vit dans le stockage objet. Jamais de fichier en base.
- **Les mots de passe.** L'identité vient de l'annuaire du client par fédération. `entra_object_id` fait le lien, rien d'autre n'est stocké.
- **Un calendrier de travail par site.** L'absence d'astreinte le week-end a été confirmée : un seul rythme, lundi au vendredi, porté par la table `parametre`. Si un second rythme devenait nécessaire, il faudrait une table `calendrier` et une clé étrangère sur `categorie`.

---

## 6. Particularités Prisma 7

Trois changements de la version 7 sont déjà pris en compte, et méritent d'être connus avant la première prise en main :

1. **L'URL de connexion ne figure plus dans `schema.prisma`.** Le bloc `datasource` ne porte que le fournisseur. L'URL vit dans `prisma.config.ts` pour les commandes Migrate, et n'atteint le client applicatif que par un adaptateur. Conséquence utile : la base de production n'est jamais joignable depuis le seul schéma.
2. **Le client passe par un adaptateur de pilote.** `new PrismaClient({ adapter })` avec `@prisma/adapter-pg`. C'est là qu'on dimensionne la réserve de connexions, voir `src/lib/prisma.ts`.
3. **La commande de seed est déclarée dans `prisma.config.ts`**, sous `migrations.seed`, et non plus dans la clé `prisma` de `package.json`.

Le client généré est écrit dans `src/generated/prisma/`, dont le point d'entrée est `client.ts`. Ce dossier est ignoré par Git : il se régénère.

## 7. Mise en route

```bash
cd mailflow
npm install
cp .env.example .env      # puis renseigner DATABASE_URL
```

```bash
npm run db:migrate -- --name socle
npm run db:migrate -- --create-only --name index_partiels   # coller sql/01
npm run db:migrate -- --create-only --name recherche        # coller sql/02
npm run db:migrate
npm run db:seed
```

Le schéma a été vérifié avec `prisma validate` en version 7.10.0.

---

## 8. Prochaines étapes

1. **Trancher les deux points de compteurs** de la section 3 et le choix sur les notifications.
2. **Valider les catégories et les délais** du jeu de départ (`prisma/seed.ts`), qui reprennent la proposition de la note d'architecture et restent en attente de la décision D3.
3. **Écrire la couche d'accès** : un module par agrégat (échange, relance, travail), jamais d'appel Prisma direct depuis un composant d'interface.
4. **Écrire les tests du calcul d'échéance** avant tout autre code : jours ouvrés, jours fériés, fenêtre 08 h à 18 h, date butoir à rebours. C'est la partie la plus subtile du système et la seule qu'on ne peut pas corriger après coup sans réécrire des échéances déjà posées.
