# Prompt de reprise — MailFlow / transfert AA Mining

> À coller tel quel au début d'une nouvelle session, dans le dossier
> `C:\Users\PC\Desktop\Claude Workspace\mailflow`.

---

Tu reprends le projet MailFlow. Une session précédente a construit et validé le
transfert automatique d'e-mails. **Commence par lire `PASSATION-TRANSFERT.md`
en entier** : 13 sections, tout y est vérifié sur l'environnement réel, avec
les commandes pour le re-prouver. Ne redécouvre rien, ne refais pas l'audit.

## Où en est le projet

Le scénario métier est **atteint et prouvé deux fois** : un mail arrive dans la
boîte surveillée, il est transféré à un destinataire externe en préservant tout
le MIME (PDF, HTML, images en CID, noms Unicode), et quand le destinataire
répond, sa réponse est rattachée au **même Echange**.

Le workflow n8n `MailFlow - Transfer Email` (id `w5ZFQEA4ha2M8orv`) est actif
et fonctionne, **sauf l'envoi SMTP** : le Code node de l'instance n'a pas le
droit de charger `nodemailer`, et le node `emailSend` jette les en-têtes
personnalisés. Le client n'a **pas** d'accès au VPS, donc la voie retenue est
la **§6 issue B** : MailFlow expose l'envoi, n8n l'appelle.

Le vrai cadrage est en **§12** : la boîte à surveiller est
`latyfatraos@gmail.com` (la dirigeante), les transferts vont à trois
collaborateurs d'AA Mining. Tout ce qui a été fait sur `dec@samko.group`
n'était que le banc d'essai. Le client a décidé de **repartir sur une base
propre** (§13).

## Ce qu'il reste à faire, dans cet ordre

1. **Remise à zéro** — l'outil existe et n'a pas été exécuté :
   `npm run base:inventaire` (lecture seule) puis `npm run base:remise-a-zero`.
   Il refuse de tourner sans sauvegarde valide de moins de 24 h. Confirme avec
   l'utilisateur avant d'exécuter : c'est irréversible.

2. **Cibles d'escalade** — aucune des 5 catégories n'en a. Le bouton
   « escalader » est donc inactif partout. À renseigner dans `/regles-relance`
   une fois qu'on sait vers qui les escalades remontent chez AA Mining.

3. **Bascule vers la boîte de Madame** — le bloc est préparé et commenté dans
   `.env`. Il manque son mot de passe d'application Google. **Ne demande jamais
   qu'on te le communique** : il se colle directement dans `.env`.
   Vérifie impérativement que `MAILFLOW_DOMAINES_INTERNES=""` reste présent et
   vide — le piège est expliqué en §12, il ferait disparaître les réponses des
   destinataires.

4. **Route d'envoi côté MailFlow** — `POST /api/transfer-send`, signée en HMAC
   comme le callback. Elle doit faire exactement ce que fait la phase 4 de
   `scripts/essai-transfert-bout-en-bout.ts` : récupération IMAP par UID,
   `transformerMime()` depuis `scripts/lib/chirurgie-mime.js`, puis
   `sendMail({ envelope, raw })`. Ce code est déjà écrit et prouvé — ne le
   réécris pas, réutilise-le. Puis remplace le Code node d'envoi du workflow
   n8n par un `httpRequest` vers cette route, avec
   `npm run n8n:deployer`.

5. **Déclencheur de transfert** — `creerTravailTransfert()` n'a toujours aucun
   appelant. La décision est prise : **manuel assisté**, un bouton sur l'écran
   de qualification, avec suggestion de destination bâtie comme
   `suggérerPourCorrespondant`. Le raisonnement complet est en §10 ; ne le
   remets pas en cause sans raison nouvelle.

## Règles non négociables

- **`npm run db:demo` est interdit.** `seed-demo.ts` commence par effacer
  utilisateurs, correspondants et échanges. Il détruirait la base propre.
  `npm run db:seed` est sûr : configuration seule, par upsert.
- **Ne te fie jamais à la seule présence d'un fichier dans `backups/`.** La
  sauvegarde produisait des fichiers vides jusqu'au 10/09/2026 ; c'est corrigé,
  mais vérifie toujours taille et marqueur de fin.
- **Aucun secret dans la conversation** : mots de passe d'application, clé API
  n8n, secret HMAC vivent dans `.env`, qui n'est pas suivi par git.
- **Ne touche à aucun des 245 autres workflows** de l'instance n8n.
- Avant toute action destructive ou tout envoi de courrier réel, **demande
  confirmation**.

## Méthode attendue

Vérifie, ne suppose pas. La session précédente a trouvé huit défauts réels
parce qu'elle a testé au lieu de lire : l'enum PostgreSQL sans `TRANSFERT`, les
en-têtes jetés par `emailSend`, les `References` en double, le secret dans les
journaux, la sauvegarde vide, un domaine sans MX. Chaque affirmation de la
passation est reproductible par une commande — fais de même pour les tiennes.

Signale toute modification de MailFlow avant de la faire.

## Commandes utiles

```bash
npm test                      # 248 tests
npm run n8n:audit             # audit de l'instance n8n
npm run n8n:deployer          # (re)déploie le workflow, idempotent
npm run n8n:tester            # 9 cas de sécurité sur le webhook
npm run n8n:tester-callback    # 9 cas sur /api/transfer-callback
npm run transfert:essai       # essai complet en local, VRAI envoi
npm run transfert:reponse     # vérifie le rattachement de la réponse
npm run base:inventaire       # ce que la remise à zéro supprimerait
npm run db:sauvegarder        # sauvegarde vérifiée
npm run capter                # lecture de la boîte
```

Le serveur de la console se lance sur le port 3005 (`.claude/launch.json`).
