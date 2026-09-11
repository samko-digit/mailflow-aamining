# MailFlow · Passation — Transfert automatique A → B via n8n

> État au **10 septembre 2026**. Document autoportant : tout ce qui suit a été
> constaté sur l'environnement réel, jamais supposé. Les affirmations sont
> reproductibles par les commandes indiquées.

---

## 1. L'objectif, et où il en est

**Cible :** un e-mail reçu par `dec@samko.group` (A) est transféré vers une
boîte B ; quand B répond, la réponse est captée par MailFlow et rattachée au
**même Echange**.

**Chaîne :** décision métier → `TravailPlanifie` TRANSFERT → ordonnanceur →
`executerTransfert()` → webhook n8n → récupération IMAP → préservation MIME →
SMTP vers B → callback n8n → MailFlow → TERMINE/ECHEC → Evenement.

### Verdict honnête

| Maillon | État |
|---|---|
| Contrat webhook + signature HMAC | ✅ prouvé des deux côtés |
| Validations (signature, horodatage, whitelist, anti-boucle) | ✅ prouvé dans n8n |
| Idempotence webhook | ✅ prouvé (non atomique — voir §7) |
| Récupération IMAP par UID + chirurgie MIME | ✅ prouvé **dans n8n**, sur un vrai message |
| **Envoi SMTP depuis n8n** | ❌ **BLOQUÉ** — voir §6 |
| Envoi SMTP avec MIME fidèle | ✅ prouvé **en local** (même code) : `250 Ok: queued` |
| Callback → TERMINE / ECHEC / idempotence | ✅ prouvé |
| Le transfert ne clôt pas l'échange à tort | ✅ prouvé |
| **B répond → même Echange** | ✅ **PROUVÉ deux fois** — voir ci-dessous |

**Le scénario métier cible est atteint.** Validé le 10/09/2026 à 19:26 et 19:34,
sur deux échanges distincts, avec de vraies réponses depuis Gmail :

```
échange 18:46 · conversationId = <mailflow-e2e-1789066018252@client-externe.example>
   ENTRANT  essai-mailflow@client-externe.example      (message d'origine)
   ENTRANT  mamounberthe@gmail.com                     (réponse de B)
      refs = [<mailflow-e2e-1789066018252@…>  <mailflow-transfer-mtvvq068@samko.group>]

échange 19:27 · conversationId = <mailflow-e2e-1789068425614@client-externe.example>
   ENTRANT  essai-mailflow@client-externe.example
   ENTRANT  mamounberthe@gmail.com
      refs = [<mailflow-e2e-1789068425614@…>  <mailflow-transfer-mtvx5iup@samko.group>]
```

Dans les deux cas `references[0] == conversationId` : la réponse de B rejoint
le dossier d'origine, sans mélange entre les deux essais. Gmail a bien
prolongé la chaîne `References` posée par la chirurgie MIME.

**Ce qui reste, et qui est purement technique :** n8n ne sait pas expédier sur
cette instance (§6). La logique, elle, est entièrement validée.

---

## 2. L'environnement réel (audité, pas supposé)

Relancer à tout moment : `npm run n8n:audit`

| Point | Valeur constatée |
|---|---|
| n8n | **2.35.3**, self-hosted, `https://n8n.srv1129806.hstgr.cloud` |
| Hébergement | VPS Hostinger `srv1129806` — **l'utilisateur n'y a PAS d'accès shell** |
| Édition | community : `$vars` vide, projets et variables sous licence |
| API publique | ✅ active (clé dans `.env`, 267 caractères) |
| Workflows | 245 avant intervention (64 actifs) — **tous intacts** |
| Boîte source | `dec@samko.group`, IMAP Dovecot Hostinger, 4 475 messages |
| Destination de test | `mamounberthe@gmail.com` (externe — indispensable, voir §5) |

### Capacités du Code node — vérifiées par sonde, puis sonde supprimée

| Capacité | Réalité |
|---|---|
| `require('imap')`, `require('mailparser')` | ✅ autorisés |
| `require('crypto')`, `node:crypto` | ❌ **interdits** |
| WebCrypto global (`crypto.subtle`) | ❌ absent |
| `require('nodemailer')`, `mailcomposer`, `imapflow`, `libmime`, `iconv-lite` | ❌ **interdits** |
| `process` | ❌ n'existe pas |
| `$env` | ❌ *access to env vars denied* |
| `$vars` | ⚠️ présent mais vide (pas de licence) |

### Autres capacités

| Capacité | Réalité |
|---|---|
| Corps brut du webhook | ✅ `options.rawBody: true` → `binary.data`, **octet pour octet** |
| HMAC-SHA256 | ✅ **node Crypto natif** — recoupé avec Node.js : identique |
| `timingSafeEqual` | ❌ absent → boucle XOR sans sortie anticipée (§7) |
| Node `emailSend` | ⚠️ **jette silencieusement tout en-tête personnalisé** (vérifié en envoyant puis relisant) |
| Data Tables | ✅ `/api/v1/data-tables`, mais **aucune contrainte d'unicité** (vérifié) |
| API Data Tables | `GET`/`POST /rows` seulement — **`PATCH` et `PUT` répondent 405** |
| Retry natif | ✅ mais `waitBetweenTries` **plafonné à 5 s** |
| Wait node | ✅ v1.1 |

**Convention maison à respecter :** les secrets IMAP vivent dans la Data Table
`imap_config` (colonnes `mailbox`, `host`, `port`, `user`, `app_password`),
parce que le Code node ne sait lire ni credential ni variable d'environnement.
C'est documenté dans une sticky note du workflow `SAMKO - IMAP Lecture v2`.

---

## 3. Le contrat exact (lu dans le code, 4 écarts vs le cahier des charges initial)

### MailFlow → n8n · `src/moteur/ordonnanceur.ts:405-455`

```
POST $N8N_WEBHOOK_URL
X-MailFlow-Signature      : HMAC-SHA256(secret, `${timestampMs}.${rawBody}`) en hex
X-MailFlow-Timestamp      : epoch en millisecondes
X-MailFlow-Idempotency-Key: `${echangeId}-transfer-${messageId}-${destination normalisée}`

{ "travailId", "requestId", "exchangeId", "messageId",
  "sourceMailbox", "destinationMailbox", "uid", "requestedAt" }
```

**Pièges :**
- le champ s'appelle `requestedAt`, **pas** `timestamp` ;
- `uid` est l'UID IMAP → **FETCH direct**, inutile de chercher par Message-ID ;
- `requestId` = `` `${travailId}-transfer-${messageId}` `` — basé sur **travailId**,
  sans destination. Ce n'est **pas** la clé d'idempotence ;
- `sourceMailbox` / `destinationMailbox` arrivent **non normalisés**.

### n8n → MailFlow · `src/app/api/transfer-callback/route.ts`

```
POST /api/transfer-callback
X-MailFlow-Signature , X-MailFlow-Timestamp      ← PAS X-N8N-*
fenêtre ±5 min

{ "travailId", "requestId", "exchangeId",
  "status": "success"|"failure",
  "messageSent"?, "messageId"?, "error"?, "completedAt" }
```

**Pièges :**
- en-têtes `X-MailFlow-*`, **pas** `X-N8N-*` ;
- le champ est `messageId`, **pas** `externalMessageId` — ce dernier serait ignoré ;
- `requestId` est re-vérifié : doit valoir `` `${travail.id}-transfer-${charge.messageId}` `` ;
- callback idempotent : si TERMINE/ECHEC/ANNULE → `200 {dejaTraite:true}`.

---

## 4. Ce qui a été construit

### Côté n8n

| Objet | Identifiant |
|---|---|
| Workflow **`MailFlow - Transfer Email`** | `w5ZFQEA4ha2M8orv` — **actif** |
| Webhook | `POST https://n8n.srv1129806.hstgr.cloud/webhook/mailflow/transfert` |
| Data Table `mailflow_config` | `oGdlk3reNaiQ8kn9` — **aucun secret dedans** (§7) |
| Data Table `mailflow_idempotence` | `gyBDSPAFyhWmK9TE` |
| Data Table `imap_config` | `DoDQhCcR8KrkH0pd` — **préexistante, réutilisée** |
| Credentials | **aucune créée** — le Code node lit `imap_config` |

18 nodes : `webhook` → `code` (corps brut) → `dataTable` (config) → `crypto`
(signature attendue) → `code` (contrôles) → `if` → `dataTable` (claim) → `if`
→ `dataTable` (insert) → `respondToWebhook` 200 → `dataTable` (accès IMAP) →
`code` (IMAP + MIME + SMTP) → `code` (corps du callback) → `crypto` (signer) →
`httpRequest` → `dataTable` (clôture), + 2 `respondToWebhook` de refus.

### Côté MailFlow

| Fichier | Nature |
|---|---|
| `scripts/lib/chirurgie-mime.js` | **cœur du dispositif** — transformation MIME, partagée |
| `scripts/auditer-n8n.ts` | audit lecture seule de l'instance |
| `scripts/deployer-transfert-n8n.ts` | déploiement idempotent du workflow |
| `scripts/tester-transfert-n8n.ts` | banc d'essai du webhook n8n |
| `scripts/tester-callback-mailflow.ts` | banc d'essai de la route de callback |
| `scripts/essai-transfert-bout-en-bout.ts` | essai complet en local, vrai envoi |
| `tests/chirurgie-mime.test.ts` | 22 tests sur la chirurgie MIME |
| `prisma/migrations/20260910180000_type_travail_transfert/` | **ajoute `TRANSFERT` à l'enum** |
| `.env` | +5 variables (secret HMAC généré, jamais affiché) |
| `.env.example`, `package.json` | documentation, 5 scripts npm |

**Aucune logique métier de MailFlow n'a été modifiée.**

`scripts/lib/chirurgie-mime.js` est **inliné** dans le Code node au
déploiement. Un test (`cohérence avec ce qui est déployé`) échoue si une copie
divergente réapparaît dans le déployeur. Ne jamais dupliquer ce code.

---

## 5. Comment MailFlow rattache une réponse — la contrainte n°1

`calculerCleDeFil()` (`src/connecteur/normalisation.ts:78`) :

```
cleDeFil = references[0] ?? inReplyTo ?? messageId
```

et `enregistrerEntrant()` cherche l'Echange par `conversationId == cleDeFil`.

**Donc le message transféré DOIT porter un `References:` commençant par la
racine du fil d'origine.** Sinon la réponse de B crée un nouvel Echange.

Vérifié sur les **vraies données** : 8/8 des messages des échanges
multi-messages existants respectent `references[0] == conversationId`.

### Trois pièges mortels

1. **`X-MailFlow-Type: transfer` est obligatoire.** Sans lui,
   `traiterSortant()` (`captation.ts:334`) voit un sortant citant l'original
   et déclenche `DETECTER_REPONSE` → **l'échange serait clôturé à tort**.
2. **B doit être sur un domaine EXTERNE.** `filtrerEntrant()`
   (`normalisation.ts:158`) écarte tout expéditeur dont le domaine est dans
   `MAILFLOW_DOMAINES_INTERNES` = `samko.group, samko-conseil.com,
   samko-academy.com`. Une boîte B en `@samko.group` rendrait la réponse
   **invisible**. D'où le choix de `mamounberthe@gmail.com`.
3. **Pas de `Reply-To` vers le client A.** `From: dec@samko.group` suffit : la
   réponse de B revient dans l'INBOX surveillée. Un `Reply-To` vers A enverrait
   la réponse de B directement au client, hors de vue de MailFlow.

**À noter :** `enregistrerEntrant()` rattache le message mais n'applique
**aucune transition** — la réponse de B ne clôt pas l'échange et n'arrête pas
les relances. `DETECTER_REPONSE` n'est déclenché que par le dossier Envoyés.
*Question ouverte pour le métier : est-ce le comportement voulu ?*

---

## 6. LE BLOCAGE, et les deux issues

**n8n ne peut pas expédier un message avec des en-têtes maîtrisés :**

- le node `emailSend` **jette** `X-MailFlow-Type`, `References`, `In-Reply-To`
  (vérifié : envoi réel puis relecture IMAP — seul `Reply-To` passait) ;
- `nodemailer` est **interdit** dans le Code node.

Le workflow s'arrête donc proprement avec :
`{ envoye: false, definitif: true, phase: "smtp", erreur: "nodemailer indisponible…" }`
après avoir **réussi** la récupération IMAP et la chirurgie MIME (`dureeMs: 288`).

### Issue A — une variable d'environnement sur le VPS *(bloquée : pas d'accès)*

```bash
NODE_FUNCTION_ALLOW_EXTERNAL=imap,mailparser,nodemailer
docker compose up -d --force-recreate n8n
```

Rien d'autre à changer : le workflow est déjà écrit pour ce cas. Un
`npm run n8n:tester -- 1` suffirait alors à valider.

### Issue B — MailFlow expose l'envoi *(recommandée sans accès VPS)*

Ajouter `POST /api/transfer-send` à MailFlow : reçoit `uid`, `source`,
`destination`, `exchangeId`, signé en HMAC comme le callback ; fait exactement
ce que fait déjà `scripts/essai-transfert-bout-en-bout.ts` phase 4 (IMAP +
`transformerMime` + `sendMail({envelope, raw})` + dépôt dans les Envoyés).
Le Code node n8n est alors remplacé par un `httpRequest`.

**Le code est déjà écrit et prouvé** — il suffit de l'envelopper dans une route.
`src/connecteur/envoi.ts:176` fait déjà `sendMail({ envelope, raw })`.

⚠️ L'issue B **exige que MailFlow soit joignable depuis le VPS** — exactement
la même exigence que le callback. Ce n'est donc pas un coût supplémentaire.

---

## 7. Décisions et limites assumées

| Sujet | Décision | Pourquoi |
|---|---|---|
| **HMAC** | node Crypto natif, secret **en paramètre de node** | `crypto` interdit en Code ; une Data Table ferait apparaître le secret dans le journal de **chaque** exécution (constaté, puis corrigé, puis secret régénéré) |
| **Comparaison** | boucle XOR sur toute la longueur | `timingSafeEqual` indisponible ; mieux que `===` qui sort au premier écart |
| **Idempotence n8n** | Data Table, lecture puis écriture | **NON ATOMIQUE** — les Data Tables n'ont aucune unicité (vérifié : 2 insertions → 2 lignes). Arrête une redélivrance séquentielle, pas deux réceptions simultanées. **La vraie garantie reste l'index `UNIQUE cle_idempotence` de MailFlow.** Une vraie atomicité exigerait PostgreSQL avec `INSERT … ON CONFLICT` |
| **Retry SMTP** | 0 / 2 min / 4 min **dans le Code node** | `waitBetweenTries` de n8n plafonne à 5 s. Ne réessaie que les erreurs n'ayant pas atteint la phase DATA (connexion, DNS, 4xx) ; 5xx et `EAUTH` sont définitifs |
| **Classification d'erreur** | item structuré, pas d'exception | **n8n efface le préfixe** d'un message d'erreur de Code node (`DEFINITIF: x` ressort `x`) |
| **Journalisation** | métadonnées seulement | IMAP + MIME + SMTP dans **un seul node** pour que le MIME ne franchisse aucune frontière et n'entre jamais dans le journal |

### Délivrabilité — constaté le 10/09/2026

Le premier transfert réel vers Gmail a été **classé en indésirables**, alors
que l'authentification du domaine est parfaite :

```
dkim=pass header.d=samko.group · spf=pass · dmarc=pass (policy=none)
```

Le classement venait donc du contenu, pas de l'authentification. Trois causes,
dont une seule concerne la production :

1. **`Auto-Submitted: auto-forwarded`** — cause structurelle. **Retiré**
   (voir le commentaire dans `chirurgie-mime.js`, et le test de
   non-régression). La RFC 3834 le prévoit, mais un transfert que B ne voit
   pas ne sert à rien ; les réponses automatiques restent filtrées en aval par
   `estAutomatique()`.
2. Faux PDF du message d'essai (quelques octets invalides) — artefact de test.
3. Objet `MAILFLOW-E2E <horodatage ISO>` — artefact de test.

**À surveiller en production :** refaire un essai avec un vrai courrier client
et vérifier le placement. Si le problème persiste, la piste suivante est de
passer la politique DMARC de `p=none` à `p=quarantine` une fois la
délivrabilité stabilisée, et d'éviter les transferts en rafale.

### Limites à connaître

1. **Pas de exactly-once SMTP.** Si n8n tombe entre l'acceptation SMTP et le
   callback, le mail est parti mais MailFlow passera `ANNULE` après 30 min.
   **Ne jamais relancer un transfert après timeout sans vérifier les Envoyés.**
2. ⚠️ **`app_password` de `dec@samko.group` apparaît en clair dans les journaux
   d'exécution n8n.** Conséquence de la convention `imap_config` — les
   workflows IMAP existants l'exposent déjà de la même façon. Remédiation :
   `saveDataSuccessExecution: "none"`, et rotation du mot de passe applicatif.
3. **Le callback est injoignable** depuis le VPS (`localhost:3000`). Tant que
   c'est le cas, chaque transfert partira mais finira `ANNULE` après 30 min.

---

## 8. Ce qui reste à faire

### Fait — la validation locale est complète

Le scénario A → B → réponse de B → même Echange est prouvé (§1). Pour le
rejouer : `npm run transfert:essai`, répondre au message depuis B, puis
`npm run transfert:reponse`.

⚠️ **Ne pas utiliser `npm run transfert:essai -- --reponse` sous PowerShell** :
les arguments placés après `--` n'y sont pas transmis, et l'essai se rejoue
intégralement au lieu de vérifier (constaté). Utiliser la commande dédiée
`npm run transfert:reponse`, ou `MAILFLOW_ESSAI_REPONSE=1`.

### Ménage à faire

Deux échanges d'essai et leurs messages restent en base au statut
`A_QUALIFIER` (sujet contenant `MAILFLOW-E2E`), plus les messages
correspondants dans la boîte. À supprimer quand ils ne servent plus.

### Pour la production

3. Choisir l'issue A ou B du §6.
4. Rendre MailFlow joignable depuis le VPS (tunnel, ou déploiement).
   Puis mettre à jour `callback_url` : `npm run n8n:deployer`.
5. **Créer le déclencheur métier.** `creerTravailTransfert()`
   (`ordonnanceur.ts:322`) **n'a toujours aucun appelant** : ni action console,
   ni route API, ni règle. La première flèche de l'architecture n'existe pas.
   *Décision métier : transfert manuel depuis la console, ou automatique sur
   critère ?* Ne pas inventer la règle.
6. Décider si la réponse de B doit **arrêter les relances** (§5, dernier point).
7. Passer les workflows lisant `imap_config` en `saveDataSuccessExecution: "none"`.

---

## 9. Commandes

```bash
npm run n8n:audit                    # audit lecture seule de l'instance
npm run n8n:deployer                 # (re)déploie le workflow, idempotent
npm run n8n:tester                   # 9 cas de sécurité/validation sur le webhook
npm run n8n:tester -- 1              # cas nominal + journal d'exécution n8n
npm run n8n:tester -- 14             # idempotence : même webhook deux fois
npm run n8n:tester-callback          # 9 cas sur /api/transfer-callback
npm run transfert:essai              # essai complet en local, VRAI envoi vers B
npm run transfert:reponse            # vérifie le rattachement de la réponse de B

npm run demo:inventaire              # démo vs réel, ne supprime rien
npm run demo:purger                  # purge, refuse si des échanges réels en dépendent
npm run extraits:verifier            # extraits illisibles, lecture seule
npm run extraits:reparer             # les recharge depuis la boîte

npm run utilisateurs:inventaire      # utilisateurs réels, lecture seule
npm run utilisateurs:creer           # les crée (idempotent)
npm test                             # suite du projet : 247 tests + 22 MIME
```

Le serveur MailFlow doit tourner sur le **port 3005** pour les tests de
callback (`.claude/launch.json`).

---

## 10. Résultats de tests obtenus

| Série | Résultat |
|---|---|
| Sécurité webhook n8n (signature ×2, horodatage ×2, source==dest, whitelist ×2, champs ×2) | **9/9** |
| Idempotence webhook (2ᵉ appel → `dejaTraite`, aucun second envoi) | **1/1** |
| Nominal n8n (accepté, IMAP OK, MIME OK, échec SMTP attendu et bien classé) | **1/1** |
| Route de callback MailFlow (signature, horodatage, corrélation ×2, succès, double callback, échec, unicité) | **9/9** |
| Chirurgie MIME (corps intact, CID, Unicode, threading, double transfert, en-têtes périmés, pas d'Auto-Submitted) | **23/23** |
| Essai local de bout en bout (dépôt, captation, travail, MIME, **envoi réel `250 Ok`**, callback, non-clôture) | **9/9** |
| Octets réellement expédiés (CID, multipart, Unicode, en-têtes, DKIM retiré, pas de doublon) | **12/12** |
| **Scénario cible A → B → réponse B → même Echange** | **✅ 2/2 échanges** |
| Suite du projet | **248/248** |

### Défauts trouvés et corrigés en cours de route

1. Audit annonçait « 0 workflow » — troncature à 4 Mo → pagination.
2. `emailSend` jette les en-têtes → bascule nodemailer.
3. **Secret HMAC en clair dans chaque exécution** → déplacé dans les nodes
   Crypto, **puis secret régénéré** (4 exécutions l'avaient capturé).
4. **Enum PostgreSQL sans `TRANSFERT`** → `creerTravailTransfert()` échouait à
   l'exécution. Migration additive créée et appliquée.
5. **`References` et `In-Reply-To` en double** dans le message transféré
   (trouvé par les tests) → ajoutés à la liste des en-têtes retirés.
6. n8n efface le préfixe `DEFINITIF:` → échec structuré.
7. `waitBetweenTries` plafonné à 5 s → retry dans le node.
8. Chirurgie MIME extraite en module partagé + garde anti-dérive.
9. **Transfert classé en spam par Gmail** malgré SPF/DKIM/DMARC valides →
   `Auto-Submitted` retiré (voir « Délivrabilité »).

### Dérive de schéma à connaître

La base contient encore `VERIFICATION_REPONSE` dans l'enum `TypeTravail`, alors
que le schéma Prisma l'a retiré. Volontairement **non supprimée** : retirer une
valeur d'enum PostgreSQL impose de recréer le type, et rien ne l'utilise.
Ne pas lancer `prisma migrate dev` sans y penser — il proposerait une
migration destructive.

---

## 11. État de la console (audité le 10/09/2026, dans le navigateur)

Les 11 pages ont été **ouvertes réellement** sur `localhost:3005`, pas relues
dans le code.

### Ce qui est sain

| Contrôle | Résultat |
|---|---|
| Pages qui s'affichent | **11/11**, aucune erreur console |
| Pages orphelines (non liées) | **aucune** — toutes dans la barre latérale |
| Boutons morts (`href="#"`, `TODO`, non câblés) | **aucun** |
| Actions serveur câblées à l'interface | **11/11** |
| Route API | 1 · `/api/transfer-callback` |

Pages : `/` · `/mails-en-attente` · `/relances` · `/repondus` · `/emails` ·
`/archives` · `/utilisateurs` · `/regles-relance` · `/parametres` ·
`/journal-activite` · `/echange/[id]`.

**Rien à retirer côté interface.** Elle est cohérente et entièrement câblée.

### Défaut trouvé et corrigé

**Extraits illisibles** — 4 échanges sur 108 affichaient du charabia binaire
dans la console. Cause : `chargerExtrait()` décodait une seconde fois un
contenu que `imapflow.download()` avait déjà débarrassé de son encodage de
transfert. Vérifié sur `uid=4387` (partie base64).

Corrigé dans `src/connecteur/imap.ts`. Les extraits déjà stockés ont été
rechargés : `npm run extraits:verifier` / `npm run extraits:reparer`.

### ⚠ CE QUI BLOQUE UN VRAI TEST : les données, pas l'interface

`npm run demo:inventaire`

| Population | Nombre |
|---|---|
| Échanges réels (captés dans `dec@samko.group`) | **100** |
| Échanges de démonstration (`prisma/seed-demo.ts`) | 22 |
| Échanges d'essai transfert (`MAILFLOW-E2E`) | 2 |
| Correspondants de démonstration | 11 / 45 |
| Boîte suivie de démonstration | 1 (inactive) |
| **Utilisateurs — TOUS fictifs** | **5 / 5** |

**Le point dur : 97 des 100 échanges réels sont attribués à des utilisateurs
qui n'existent pas** (`@exemple-mining.ml`). Conséquences si on teste en
l'état :

- les relances partiraient au nom de personnes fictives ;
- les escalades n'atteindraient personne ;
- aucun chiffre de la console n'est interprétable — « 124 mails suivis »
  compte 24 dossiers inventés.

### L'ordre des opérations, et il n'est pas négociable

1. **Créer les vrais utilisateurs SAMKO** (page `/utilisateurs` ou en base).
2. **Réattribuer les 97 échanges réels** à ces vrais responsables.
3. **Puis seulement** purger : `npm run demo:purger`.

`purger-demonstration.ts` **refuse de s'exécuter** tant que des échanges réels
dépendent d'un utilisateur fictif — il l'a fait le 10/09/2026. Il ne touche
jamais à un échange réel, ni à une boîte active, et la suppression emporte par
cascade messages, relances, événements et travaux.

### Autres points relevés

- **L'ordonnanceur ne tourne plus depuis le 08/09/2026** (`/parametres`,
  « Dernier passage »). Sans lui, aucune relance ne part. `npm run moteur:boucle`.
- Les 2 échanges d'essai `MAILFLOW-E2E` sont au statut « à qualifier » et
  polluent la console. Ils partent avec la purge.

---

## 12. LE CADRAGE RÉEL (révélé le 10/09/2026 — lire avant tout le reste)

Tout ce qui précède a été construit et validé sur `dec@samko.group`. **Ce
n'était que le banc d'essai.** L'usage réel est différent :

> Les messages de **Madame `latyfatraos@gmail.com`** (la dirigeante) doivent
> être transférés à ses trois collaborateurs.

| Rôle | Adresse |
|---|---|
| **Boîte A surveillée** | `latyfatraos@gmail.com` |
| Destination B | `info@aamining.net` — boîte générique |
| Destination B | `baremabocoum@aamining.net` — Baréma Bocoum |
| Destination B | `mariamtraore@aamining.net` — Mariam Traoré |
| Destination B | `barema14@gmail.com` — seconde adresse de Baréma Bocoum |

Quatre adresses, **trois personnes**. MailFlow n'accepte qu'un e-mail par
utilisateur : `barema14@gmail.com` n'a donc pas de compte, elle vit uniquement
dans la liste blanche des destinations.

### ⚠ Faute de frappe rattrapée — deux adresses sur quatre étaient mortes

Les adresses avaient été communiquées en `@aaming.net`. Vérification DNS :

| Domaine | MX |
|---|---|
| `aamining.net` | ✅ `mx1.hostinger.com`, `mx2.hostinger.com` |
| `aaming.net` | ❌ **aucun** — aucune livraison possible |

Il manquait le `in` de « mining ». Corrigé après confirmation. Sans cette
vérification, deux transferts sur quatre seraient partis dans le vide — ou
chez un tiers, si ce domaine venait à être déposé par quelqu'un d'autre.

**Toujours vérifier les MX d'un domaine de destination avant de l'inscrire
dans une liste blanche.**

### ⚠ LE PIÈGE QUI CASSERAIT TOUT — `MAILFLOW_DOMAINES_INTERNES`

`filtrerEntrant()` (`normalisation.ts:158`) écarte tout expéditeur dont le
domaine figure dans cette variable. Les destinataires des transferts sont en
`@aamining.net` et `@gmail.com`.

- si `aamining.net` y figure → **les réponses des trois collaborateurs sont
  jetées**, la fonctionnalité entière devient inutile ;
- si la variable est **absente**, le code retombe sur le domaine de la boîte,
  donc `gmail.com` → **les réponses de `barema14@gmail.com` disparaissent**.

Elle doit donc rester **explicitement présente et vide** :
`MAILFLOW_DOMAINES_INTERNES=""`.

Contrepartie assumée : plus aucun filtrage « expéditeur interne ». Les
messages des collègues entrent au registre comme les autres.

### Ce qui a été fait

- Les 3 utilisateurs réels sont créés (`npm run utilisateurs:creer`), visibles
  dans `/utilisateurs`. Noms **déduits des adresses** — orthographe et
  fonctions à confirmer.
- `MAILFLOW_DESTINATIONS_TRANSFERT` contient les 4 adresses corrigées, et n8n
  l'applique (vérifié : `infox@aamining.net` → 403).
- Le bloc de bascule Gmail est **préparé mais commenté** dans `.env`.

### Ce qu'il reste, dans l'ordre

1. **Obtenir de Madame elle-même** : validation en deux étapes activée, un
   mot de passe d'application (https://myaccount.google.com/apppasswords), et
   IMAP activé dans Gmail. **Ce mot de passe se colle directement dans `.env`,
   il ne doit transiter par aucune conversation ni aucun ticket.**
2. Décommenter le bloc de bascule dans `.env`, sans oublier
   `MAILFLOW_DOMAINES_INTERNES=""`.
3. Créer la `BoiteSuivie` pour `latyfatraos@gmail.com` (`npm run capter` la
   crée au premier passage).
4. Décider du sort des **100 échanges captés dans `dec@samko.group`** : ils
   appartiennent à une autre boîte et à un autre usage. Les garder fausserait
   tous les compteurs de la console.
5. Réattribuer les échanges réels aux vrais utilisateurs, **puis**
   `npm run demo:purger` (il refuse tant que 97 échanges dépendent d'un
   utilisateur fictif).
6. Relancer l'ordonnanceur, à l'arrêt depuis le 08/09/2026.

### Points à confirmer auprès du client

- Orthographe exacte des noms et fonctions des trois collaborateurs.
- `info@aamining.net` est-elle une boîte partagée ou une personne ?
- Le transfert reste-t-il **manuel** (voir §10, recommandation) ? Avec une
  dirigeante dont toute la correspondance passe par une seule boîte, la
  tentation d'automatiser est forte — et le risque de faire fuiter un message
  confidentiel vers le mauvais collaborateur l'est tout autant.

---

## 13. REPARTIR SUR UNE BASE PROPRE POUR AA MINING

> **Décision du client, 10/09/2026 : base propre.** Les 100 échanges captés
> dans `dec@samko.group` appartiennent à une autre boîte et à un autre usage.
> Les conserver fausserait tous les compteurs de la console.
>
> **Cette procédure n'a PAS été exécutée** — le client a demandé qu'elle soit
> documentée pour être menée dans une session ultérieure.

### État de départ (mesuré le 10/09/2026)

| Table | Lignes | Sort |
|---|---|---|
| `Echange` | 124 | **supprimer** |
| `Message` | 135 | cascade depuis `Echange` |
| `PieceJointe` | 4 | cascade depuis `Message` |
| `Relance` | 12 | cascade depuis `Echange` |
| `TravailPlanifie` | 299 | cascade + orphelins à traiter |
| `Evenement` | 483 | **supprimer explicitement** (voir piège n°1) |
| `Correspondant` | 45 | **supprimer** |
| `BoiteSuivie` | 2 | **supprimer** |
| `Utilisateur` | 8 | supprimer les **5 fictifs**, garder les **3 réels** |
| `Categorie` | 5 | **CONSERVER** |
| `RegleRelance`, `ModeleMessage`, `ExpediteurExclu` | — | **CONSERVER** |
| `JourFerie` | 6 | **CONSERVER** (jours fériés maliens) |
| `Parametre` | 9 | conserver, mais **réinitialiser 2 valeurs** |

### Les quatre pièges

**1. `Evenement` n'est PAS en cascade.** `Evenement.echangeId` est déclaré
`onDelete: SetNull` (schema.prisma:603). Supprimer les échanges laisse donc
483 événements orphelins, avec `echangeId` à `null`, qui continueront de
s'afficher dans `/journal-activite`. **Les supprimer d'abord, explicitement.**

**2. `Categorie.escaladeVers` pointe vers un utilisateur.** Déclaré
`onDelete: SetNull` (schema.prisma:289). Supprimer les utilisateurs fictifs
vide donc la cible d'escalade des catégories : les escalades ne partiraient
plus nulle part, **sans erreur visible**. Il faut re-pointer chaque catégorie
vers un utilisateur réel après la purge.

**3. `TravailPlanifie` sans échange.** Les travaux de type `SYNCHRO_BOITE`
ont `echangeId` à `null` : aucune cascade ne les emporte. Les supprimer à part.

**4. `npm run db:demo` NE DOIT PLUS JAMAIS ÊTRE LANCÉ.** `prisma/seed-demo.ts`
commence par `echange.deleteMany()`, `correspondant.deleteMany()` et
`utilisateur.deleteMany()` avant de semer de la fiction : il détruirait la
base propre et les 3 utilisateurs réels.
À l'inverse, `npm run db:seed` (`prisma/seed.ts`) est **sûr** : il ne sème que
la configuration, par `upsert`, sans toucher aux utilisateurs ni aux échanges.

### Voie A — chirurgicale (recommandée)

Conserve la configuration et les 3 utilisateurs réels déjà créés.

**Le script existe désormais** : `scripts/repartir-a-zero.ts`, en lecture seule
par défaut. Il n'a **pas** été exécuté.

```bash
npm run db:sauvegarder      # sauvegarde vérifiée (voir l'avertissement plus bas)
npm run base:inventaire     # montre exactement ce qui partirait — ne touche à rien
npm run base:remise-a-zero  # exécute
```

Il refuse de s'exécuter s'il n'existe pas de sauvegarde **valide de moins de
24 h**, ou si aucun utilisateur réel n'est en base. Il traite les quatre
pièges dans l'ordre, et signale ce qui restera à faire à la main.

<details>
<summary>Ce qu'il fait, dans l'ordre</summary>

```
# 1. SAUVEGARDE OBLIGATOIRE — ne rien lancer sans elle
npm run db:sauvegarder
ls backups/                    # vérifier que le fichier est bien là et non vide

# 2. scripts/repartir-a-zero.ts exécute DANS CET ORDRE :
#    a. prisma.evenement.deleteMany()                    → piège n°1
#    b. prisma.travailPlanifie.deleteMany()              → piège n°3
#    c. prisma.echange.deleteMany()                      → cascade messages,
#                                                          pièces jointes, relances
#    d. prisma.correspondant.deleteMany()
#    e. prisma.boiteSuivie.deleteMany()
#    f. prisma.utilisateur.deleteMany({ where: {
#         OR: [{ email: { contains: "exemple-mining.ml" } },
#              { email: "dec@samko.group" }] } })        → garde les 3 réels
#    g. réinitialiser les paramètres de suivi :
#       « Dernier passage de l'ordonnanceur » et
#       « Suivi des alertes déjà diffusées » → null
#
```
</details>

### ⚠ La sauvegarde était cassée — corrigée le 10/09/2026

`sauvegarder-base.ts` passait le `DATABASE_URL` complet à `pg_dump`, qui
refuse le paramètre `?schema=public` propre à Prisma. La commande échouait,
**mais la redirection shell avait déjà créé un fichier vide**, qui passait
ensuite pour une sauvegarde valide. Deux fichiers de 0 octet dormaient dans
`backups/`.

Corrigé : la chaîne de connexion est nettoyée, le dump est **vérifié** (taille
non nulle et marqueur `PostgreSQL database dump complete`), un fichier
invalide est supprimé au lieu d'être conservé, et le mot de passe n'est plus
affiché. Une sauvegarde valide fait ~0,34 Mo pour 17 tables.

**Ne jamais se fier à la seule présence d'un fichier dans `backups/`.**

### Lacune préexistante relevée au passage

**Aucune des 5 catégories n'a de cible d'escalade** (`Categorie.escaladeVers`
est nul partout). Le bouton « escalader » de `/echange/[id]` est donc inactif
pour tous les échanges — `disabled={!echange.categorie?.escaladeVers}`.

Sans rapport avec la remise à zéro : c'est une configuration à compléter dans
`/regles-relance`, une fois qu'on saura vers qui les escalades doivent
remonter chez AA Mining.

# Vérifier après coup
npm run db:check
```

### Voie B — radicale

Repart d'un schéma vierge. Plus simple, mais efface aussi les 3 utilisateurs.

```bash
node --import tsx scripts/sauvegarder-base.ts   # toujours d'abord
npx prisma migrate reset                        # rejoue les 4 migrations
                                                # puis prisma/seed.ts (config seule)
npm run utilisateurs:creer                      # recrée les 3 utilisateurs réels
```

`migrate reset` rejoue bien la migration `20260910180000_type_travail_transfert`,
donc `TRANSFERT` reste dans l'enum. Vérifier tout de même après coup :

```sql
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'TypeTravail';
```

### Côté n8n — à nettoyer aussi

Les essais ont laissé des traces qui fausseraient l'idempotence :

- vider la Data Table **`mailflow_idempotence`** (`gyBDSPAFyhWmK9TE`) de ses
  lignes d'essai ;
- ajouter une ligne à **`imap_config`** (`DoDQhCcR8KrkH0pd`) pour la boîte de
  Madame — colonnes `mailbox`, `host`, `port`, `user`, `app_password` — si le
  Code node n8n doit faire la récupération IMAP :
  `mailbox="latyfatraos"`, `host="imap.gmail.com"`, `port=993`,
  `user="latyfatraos@gmail.com"`, `app_password=<mot de passe d'application>` ;
- **ne pas toucher** aux 245 autres workflows de l'instance.

### Après la purge — liste de vérification

1. `/` affiche **0 mail suivi** — plus aucun compteur hérité.
2. `/utilisateurs` affiche **3 utilisateurs**, tous en `@aamining.net`.
3. `/regles-relance` affiche toujours les 5 catégories, **avec une cible
   d'escalade renseignée** pour chacune.
4. `/parametres` : plus aucune boîte suivie, « Dernier passage » vide.
5. `npm test` → **248/248**.
6. Configurer la boîte de Madame (§12), puis `npm run capter` : elle crée la
   `BoiteSuivie` et remplit une base qui ne contient plus que du réel.

### Ce qui ne doit PAS être supprimé

Les catégories, règles de relance, modèles de message, exclusions et jours
fériés sont de la **configuration métier**, pas des données d'essai. Les
catégories actuelles (date butoir fiscale, approvisionnement/transit…) ont été
taillées pour une société minière : elles conviennent vraisemblablement à AA
Mining. À faire relire par le client plutôt qu'à jeter.
