# MailFlow · Essais sur vos propres boîtes

Tout se règle par variables d'environnement. Passer des boîtes d'essai aux vraies boîtes se fera en changeant **cinq lignes**, sans toucher à une ligne de code.

---

## 1. Ce qu'il faut réellement

**Une seule boîte a besoin d'identifiants** : celle que le système surveille. Le second rôle, celui du correspondant qui écrit et à qui on répond, peut être **n'importe quelle adresse depuis laquelle vous savez envoyer à la main**. Le système ne s'y connecte jamais.

| Rôle | Ce qu'il faut | Exemple d'essai | En production |
|---|---|---|---|
| **Boîte suivie** | adresse + mot de passe IMAP | `dec@samko.group` | `info@aamining.net` |
| **Correspondant** | savoir envoyer depuis cette adresse | votre Gmail personnel | les clients, douanes, transitaires |
| **Boîte amont** (facultatif) | accès aux réglages de transfert | votre Gmail | `latyfatraos@gmail.com` |

`samko.group` et `aamining.net` sont sur **la même infrastructure Hostinger**. Les essais menés sur l'un vaudront pour l'autre : mêmes serveurs, mêmes conventions de nommage des dossiers, mêmes limites.

---

## 2. Où trouver les réglages Hostinger

Panneau Hostinger → **Emails** → votre domaine → **Comptes de messagerie** → **Paramètres de configuration**.

Valeurs habituelles, à confirmer sur votre panneau :

```bash
MAILFLOW_IMAP_HOTE="imap.hostinger.com"
MAILFLOW_IMAP_PORT="993"
MAILFLOW_SMTP_HOTE="smtp.hostinger.com"
MAILFLOW_SMTP_PORT="465"
MAILFLOW_IMAP_UTILISATEUR="dec@samko.group"   # l'adresse complète, pas juste "dec"
MAILFLOW_IMAP_MOT_DE_PASSE="..."
MAILFLOW_BOITE="dec@samko.group"
MAILFLOW_DOSSIER_ENVOYES=""                    # le script vous donnera la valeur
```

Deux garde-fous, à laisser tels quels pendant toute la phase d'essai :

```bash
MAILFLOW_ENVOI_AUTORISE="false"
MAILFLOW_DESTINATAIRES_AUTORISES="dec@samko.group"
```

Tant que le premier vaut `false`, **aucun message ne peut sortir**, quelle que soit la suite du code. Le second limite les destinataires même une fois l'envoi ouvert.

---

## 3. Les quatre essais

### Essai 1 · La boîte est-elle lisible ?

```bash
npm run imap:test
```

Sept contrôles : réglages, connexion, dossiers, boîte de réception, lecture des en-têtes, en-têtes de fil, dossier des envoyés. Le script ne modifie rien, ne marque aucun message comme lu.

**Ce qu'on veut voir** : la liste des dossiers, le dossier des envoyés détecté, et les cinq derniers messages avec leur `Message-ID`.

Notez la valeur de `MAILFLOW_DOSSIER_ENVOYES` que le script vous propose et reportez-la dans le `.env`.

### Essai 2 · Le chaînage des réponses

C'est l'essai qui décide de la faisabilité.

1. Depuis une **autre** adresse, envoyez un message à la boîte suivie. Objet : `Essai MailFlow 1`.
2. Depuis la boîte suivie, cliquez sur **Répondre** et envoyez.
3. Relancez `npm run imap:test`.

**Ce qu'on veut voir** : au contrôle 6, la mention `In-Reply-To` présente. Et au contrôle 7, le dossier des envoyés qui contient au moins un message.

Si `In-Reply-To` apparaît, la détection des réponses est fiable. Sinon, elle retombera sur un rapprochement par correspondant, qui ne clôt jamais un dossier tout seul.

### Essai 3 · Les envois sont-ils sur le serveur ?

Le contrôle 7 y répond. Si le dossier des envoyés est **vide alors que vous venez d'envoyer**, c'est que le client de messagerie garde les envois en local.

**Pourquoi c'est bloquant** : c'est dans ce dossier que le système lira les réponses parties de la boîte pour arrêter les relances. Sans copie serveur, il ne les verra jamais et relancera des dossiers déjà traités.

La correction se fait dans le client de messagerie : cocher l'option d'enregistrement des messages envoyés sur le serveur. Le webmail Hostinger le fait nativement.

### Essai 4 · Le transfert automatique préserve-t-il le fil ?

Celui-ci reproduit le circuit de Madame, **avec votre propre Gmail**, sans déranger personne.

1. Dans **votre** Gmail : *Paramètres → Transfert et POP/IMAP → Ajouter une adresse de transfert* → la boîte suivie. Confirmez le code reçu.
2. Activez le transfert automatique en conservant une copie.
3. Depuis une troisième adresse, envoyez un message à votre Gmail. Objet : `Essai MailFlow 4`.
4. Relancez `npm run imap:test`.

**Ce qu'on veut voir** : le message arrivé dans la boîte suivie porte **l'expéditeur d'origine**, pas votre Gmail, et **le même `Message-ID`** que l'original.

Comparez avec l'original : dans Gmail, *Afficher l'original* donne le `Message-ID`.

| Résultat | Conséquence |
|---|---|
| Même `Message-ID`, expéditeur d'origine | Le transfert automatique se comporte en redirection. Circuit fiable, à généraliser. |
| `Message-ID` différent | Le fil est rompu à l'entrée. Il faudra que les correspondants écrivent directement à la boîte suivie, ou qu'elle soit systématiquement en copie. |

C'est le seul essai dont je ne peux pas prédire le résultat avec certitude. Il vaut cinq minutes.

---

## 4. Passer aux vraies boîtes

Quand les quatre essais sont concluants, la bascule tient en cinq lignes :

```diff
- MAILFLOW_IMAP_UTILISATEUR="dec@samko.group"
- MAILFLOW_IMAP_MOT_DE_PASSE="<mot de passe d'essai>"
- MAILFLOW_BOITE="dec@samko.group"
- MAILFLOW_DESTINATAIRES_AUTORISES="dec@samko.group"
- MAILFLOW_ENVOI_AUTORISE="false"
+ MAILFLOW_IMAP_UTILISATEUR="info@aamining.net"
+ MAILFLOW_IMAP_MOT_DE_PASSE="<mot de passe de production>"
+ MAILFLOW_BOITE="info@aamining.net"
+ MAILFLOW_DESTINATAIRES_AUTORISES="info@aamining.net,mariamtraore@aamining.net"
+ MAILFLOW_ENVOI_AUTORISE="false"
```

Les hôtes IMAP et SMTP ne changent pas : les deux domaines sont chez Hostinger.

`MAILFLOW_ENVOI_AUTORISE` reste à `false` même après la bascule. On le passe à `true` en dernier, une fois la détection des réponses prouvée sur du courrier réel. C'est le seul interrupteur qui autorise un message à sortir.

---

## 5. Ce qui reste à obtenir côté production

- Le mot de passe de `info@aamining.net`, idéalement un mot de passe dédié.
- La confirmation que le dossier des envoyés de cette boîte est bien synchronisé sur le serveur.
- L'accord pour poser le transfert automatique sur `latyfatraos@gmail.com`, si l'essai 4 est concluant.
- Une boîte de recette sur `aamining.net`, si l'offre Hostinger le permet.
