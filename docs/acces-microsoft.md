# MailFlow · Obtenir les accès Microsoft 365

Pas à pas pour l'administrateur informatique. Compter 30 minutes.

À la fin, vous aurez rempli cinq lignes dans `mailflow/.env` et vérifié qu'elles fonctionnent avec `npm run graph:test`.

---

## Ce qu'il faut avant de commencer

| Besoin | Détail |
|---|---|
| Un compte administrateur | Rôle **Administrateur d'application** au minimum pour créer l'application, et **Administrateur général** ou **Administrateur de rôle privilégié** pour accorder le consentement. |
| Rôle Exchange | **Administrateur Exchange**, pour créer la boîte de recette et poser la restriction d'accès. |
| PowerShell | Pour l'étape 4 uniquement. Le module `ExchangeOnlineManagement`. |

---

## Étape 1 · Créer l'application

Ouvrir **https://entra.microsoft.com**

**Identité → Applications → Inscriptions d'applications → Nouvelle inscription**
*(Identity → Applications → App registrations → New registration)*

| Champ | Valeur |
|---|---|
| Nom | `MailFlow` |
| Types de comptes pris en charge | **Comptes dans cet annuaire d'organisation uniquement** (locataire unique) |
| URI de redirection | **Laisser vide** |

Cliquer sur **Inscrire**.

Vous arrivez sur la page **Vue d'ensemble**. Deux des cinq valeurs y sont, côte à côte :

```
ID d'application (client)   →  AZURE_CLIENT_ID
ID de l'annuaire (locataire) →  AZURE_TENANT_ID
```

Ces deux valeurs ne sont pas secrètes. Copiez-les.

> **Pourquoi aucune URI de redirection ?** Parce qu'aucun humain ne se connecte. L'application s'authentifie seule, avec son secret. C'est précisément ce qui évite la panne du dispositif précédent, où il fallait qu'une personne clique pour réautoriser l'accès.

---

## Étape 2 · Créer le secret

Menu de gauche → **Certificats et secrets** (*Certificates & secrets*) → onglet **Secrets client** (*Client secrets*) → **+ Nouveau secret client** (*New client secret*)

| Champ | Valeur |
|---|---|
| Description | `MailFlow production` |
| Expire | **24 mois** si la politique le permet |

Cliquer sur **Ajouter**.

⚠️ **Le piège classique.** Le tableau affiche deux colonnes, **Valeur** (*Value*) et **ID de secret** (*Secret ID*). C'est la colonne **Valeur** qu'il faut copier. L'ID de secret ne sert à rien pour nous.

⚠️ **La valeur ne s'affiche qu'une seule fois.** Si vous quittez la page sans copier, il faut supprimer ce secret et en créer un autre. Ce n'est pas grave, mais autant le savoir.

```
Valeur  →  AZURE_CLIENT_SECRET
```

**Notez aussi la date d'expiration** dans `AZURE_CLIENT_SECRET_EXPIRE`. La surveillance vous alertera 30 jours avant. Le jour où ce secret expire sans avoir été renouvelé, plus rien ne fonctionne.

---

## Étape 3 · Accorder les permissions

Menu de gauche → **Autorisations d'API** (*API permissions*) → **+ Ajouter une autorisation** (*Add a permission*) → **Microsoft Graph**

Deux cartes s'affichent. Puis, et c'est le point décisif :

> **Choisir « Autorisations d'application » (*Application permissions*), PAS « Autorisations déléguées » (*Delegated permissions*).**
>
> Les autorisations déléguées agissent au nom d'un utilisateur connecté. Il n'y a pas d'utilisateur connecté ici, le système tourne la nuit. Les autorisations d'application agissent au nom de l'application elle-même. Le libellé de la bonne carte le dit : *« runs as a background service or daemon without a signed-in user »*.

**Comment savoir si vous êtes sur le bon onglet**, sans rien deviner :

| Indice | Autorisations déléguées | Autorisations d'application |
|---|---|---|
| Colonne *Admin consent required* | `No` sur `Mail.Read` | **`Yes`** sur toutes les lignes |
| Variantes `.Shared` (`Mail.Read.Shared`…) | présentes | **absentes** |

Les variantes `.Shared` n'existent qu'en délégué, parce que « shared » désigne les boîtes partagées auxquelles l'utilisateur connecté a accès. Si vous les voyez, vous êtes au mauvais endroit.

Rechercher et cocher exactement deux permissions :

| Permission | Ce qu'elle permet |
|---|---|
| `Mail.Read` | Lire les messages, leurs en-têtes techniques et leurs pièces jointes. Couvre aussi les requêtes différentielles. |
| `Mail.Send` | Envoyer les relances depuis la boîte suivie. |

Cliquer sur **Ajouter des autorisations** (*Add permissions*).

Puis, sur la page des autorisations, cliquer sur **Accorder le consentement d'administrateur pour \<votre organisation\>** (*Grant admin consent for …*) et confirmer.

La colonne **État** doit afficher une coche verte « Accordé pour \<organisation\> » (*Granted for …*) sur les deux lignes. **Sans cette étape, l'application obtient un jeton mais sans aucun droit** : c'est l'oubli le plus fréquent, et `npm run graph:test` le signale par « Aucune permission d'application dans le jeton ».

Une autorisation déléguée `User.Read` traîne souvent dans la liste par défaut. Elle est inoffensive puisque personne ne se connecte ; les trois points en fin de ligne permettent de la retirer si vous préférez faire propre.

> **Ne pas prendre `Mail.ReadWrite`.** Nous n'avons aucune raison de modifier ou de déplacer les messages du client. Le moindre privilège consiste à ne pas ouvrir une porte dont on n'a pas l'usage.

---

## Étape 4 · Restreindre l'accès aux seules boîtes concernées

**C'est l'étape la plus importante du document.**

En l'état, `Mail.Read` en autorisation d'application donne accès à **toutes les boîtes aux lettres du tenant**. Celle du directeur, celle des ressources humaines, toutes. Il faut refermer cette porte.

Ouvrir PowerShell :

```powershell
Install-Module ExchangeOnlineManagement -Scope CurrentUser
Connect-ExchangeOnline -UserPrincipalName admin@votredomaine.com
```

Créer un groupe de sécurité à extension messagerie contenant **uniquement** les boîtes du périmètre :

```powershell
New-DistributionGroup -Name "MailFlow-Boites" -Type Security `
  -Members "administration@votredomaine.com","recette-mailflow@votredomaine.com"
```

Poser la restriction :

```powershell
New-ApplicationAccessPolicy `
  -AppId "<AZURE_CLIENT_ID>" `
  -PolicyScopeGroupId "MailFlow-Boites@votredomaine.com" `
  -AccessRight RestrictAccess `
  -Description "MailFlow : acces limite aux boites suivies"
```

Vérifier **dans les deux sens**, le second test compte autant que le premier :

```powershell
# Doit rendre AccessCheckResult : Granted
Test-ApplicationAccessPolicy -Identity "administration@votredomaine.com" -AppId "<AZURE_CLIENT_ID>"

# Doit rendre AccessCheckResult : Denied
Test-ApplicationAccessPolicy -Identity "<une boite hors perimetre>" -AppId "<AZURE_CLIENT_ID>"
```

Compter parfois jusqu'à une heure de propagation avant que la stratégie ne prenne effet.

> Microsoft propose aussi un mécanisme plus récent, le contrôle d'accès basé sur les rôles pour les applications. La stratégie d'accès applicatif décrite ici reste prise en charge et convient parfaitement à ce périmètre.

---

## Étape 5 · Les deux boîtes

Ouvrir **https://admin.exchange.microsoft.com**

**La boîte suivie** existe déjà, c'est celle du processus. Relevez son adresse exacte.

**La boîte de recette** est à créer : **Destinataires → Boîtes aux lettres partagées → + Ajouter une boîte aux lettres partagée**
*(Recipients → Shared mailboxes → + Add a shared mailbox)*.

Une boîte partagée ne consomme aucune licence, elle est gratuite. Nommez-la par exemple `recette-mailflow@votredomaine.com`.

> **Pourquoi elle est indispensable.** Quand nous testerons l'envoi des relances, les messages partiront quelque part. Sur la vraie boîte, le vrai transitaire recevrait un vrai courriel « relance numéro 3 sur le conteneur MSKU 4471 » pour un dossier peut-être déjà réglé. Impossible à rattraper.

---

## Étape 6 · Remplir le fichier et vérifier

Ouvrir `mailflow/.env` et compléter :

```bash
AZURE_TENANT_ID="..."
AZURE_CLIENT_ID="..."
AZURE_CLIENT_SECRET="..."
AZURE_CLIENT_SECRET_EXPIRE="2028-09-07"
MAILFLOW_BOITE="administration@votredomaine.com"
MAILFLOW_BOITE_RECETTE="recette-mailflow@votredomaine.com"
```

Ce fichier ne quitte jamais la machine : il est exclu de Git. Le secret n'a pas à circuler par courriel ou par messagerie.

Puis :

```bash
npm run graph:test
```

Le script vérifie quatre choses dans l'ordre : les cinq valeurs sont présentes, Microsoft accepte l'identifiant et le secret, les bonnes permissions sont accordées, et les deux boîtes sont réellement accessibles. Il affiche pour chaque échec la cause probable et la correction.

---

## Les erreurs les plus fréquentes

| Message | Cause | Correction |
|---|---|---|
| `AADSTS7000215` | Secret invalide | Vous avez copié « ID de secret » au lieu de « Valeur » |
| `AADSTS700016` | Application introuvable | Mauvais `AZURE_CLIENT_ID`, ou application créée dans un autre tenant |
| `AADSTS90002` | Tenant introuvable | Mauvais `AZURE_TENANT_ID` |
| Jeton obtenu, aucune permission | Consentement non accordé | Retourner sur **Autorisations d'API** et cliquer sur **Accorder le consentement d'administrateur** |
| Jeton obtenu, permissions absentes | Mauvais type d'autorisation | Vous avez pris « déléguées » au lieu de « d'application » |
| `403` sur une boîte | Stratégie d'accès trop restrictive | La boîte n'est pas dans le groupe `MailFlow-Boites`, ou la stratégie n'a pas fini de se propager |
| `404` sur une boîte | Adresse inconnue | Faute de frappe, ou adresse d'un autre tenant |

---

## Ce que ces accès ne permettent PAS

Utile à dire si quelqu'un s'en inquiète :

- **Aucun accès à l'annuaire.** Ni la liste des employés, ni les groupes, ni les profils.
- **Aucun accès aux fichiers**, à SharePoint, à OneDrive, à Teams, au calendrier.
- **Aucune modification des messages.** Le système lit et copie, il ne déplace ni ne supprime rien.
- **Aucune autre boîte que celles du groupe**, une fois l'étape 4 posée et vérifiée.
