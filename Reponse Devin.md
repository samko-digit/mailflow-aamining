SPÉCIFICATION TECHNIQUE D'IMPLÉMENTATION DU POC MAILFLOW × N8N
3. ANALYSE OBLIGATOIRE DE TravailPlanifie
3.1. Analyse du code existant
Enum TypeTravail (src/moteur/decision.ts) :



export type TypeTravail =
  | "RELANCE"
  | "ESCALADE"
  | "ARCHIVAGE"
  | "SYNCHRO_BOITE"
  | "RENOUVELLEMENT_ABONNEMENT";
Modèle TravailPlanifie (prisma/schema.prisma) :



model TravailPlanifie {
  id   String      @id @default(cuid())
  type TypeTravail
  echangeId String?
  executerA DateTime
  statut    StatutTravail @default(EN_ATTENTE)  // EN_ATTENTE, EN_COURS, TERMINE, ECHEC, ANNULE
  tentatives     Int @default(0)
  derniereErreur String?
  verrouPar      String?
  verrouA        DateTime?
  charge Json?   // Données nécessaires à l'exécution
  cleIdempotence String @unique
  creeLe    DateTime @default(now())
  termineLe DateTime?
}
Mécanisme de création (ordonnanceur.ts - executerCaptation) :



// Ligne 165-174 : Planification de la captation suivante
async function planifierCaptation(adresse: string, quand: Date): Promise<void> {
  await prisma.travailPlanifie.create({
    data: {
      type: "SYNCHRO_BOITE",
      executerA: quand,
      charge: { boite: adresse },
      cleIdempotence: `synchro-${adresse}-${quand.toISOString()}`,
    },
  });
}
Mécanisme de prise en charge (ordonnanceur.ts - prendreTravaux) :



// Ligne 136-153 : Prise avec FOR UPDATE SKIP LOCKED
export async function prendreTravaux(limite: number, identifiant: string): Promise<TravailPris[]> {
  return prisma.$queryRaw<TravailPris[]>`
    UPDATE travail_planifie
       SET statut = 'EN_COURS', verrou_par = ${identifiant}, verrou_a = now()
     WHERE id IN (
       SELECT id FROM travail_planifie
        WHERE statut = 'EN_ATTENTE' AND executer_a <= now()
        ORDER BY executer_a LIMIT ${limite}
        FOR UPDATE SKIP LOCKED
     )
    RETURNING id, type, echange_id, charge, tentatives`;
}
Mécanisme d'exécution (ordonnanceur.ts - executerUn) :



// Ligne 408-453 : Switch sur le type
switch (t.type) {
  case "RELANCE": return await executerRelance(...)
  case "ESCALADE": return await executerEscalade(...)
  case "ARCHIVAGE": return await archiverEchange(...)
  case "SYNCHRO_BOITE": return await executerCaptation(...)
  default: return { issue: "perime", detail: "type non pris en charge" }
}
Mécanisme de statut (ordonnanceur.ts - lignes 557-609) :

execute → TERMINE
refuse → EN_ATTENTE (reporté)
incoherent → ECHEC
perime → ANNULE
3.2. Réponses aux questions
1. Peut-on ajouter TRANSFERT sans modifier le scheduler ? OUI. Le scheduler est générique :

Il lit tous les travaux EN_ATTENTE avec executerA <= now()
Il passe le statut à EN_COURS avec verrou
Il appelle executerUn() qui switch sur le type
Il suffit d'ajouter case "TRANSFERT" dans le switch
2. Peut-on créer le travail puis appeler n8n directement ? NON, pas via le scheduler. Pour le PoC, deux approches :

Approche A (recommandée pour PoC) :

Créer le travail avec statut = "EN_ATTENTE"
Appeler n8n immédiatement via webhook (asynchrone)
n8n callback met à jour le statut
Approche B (via scheduler) :

Créer le travail avec executerA = now()
Le scheduler le prendra au prochain cycle
Ajouter case "TRANSFERT" dans executerUn()
executerTransfert() appelle n8n
Recommandation : Approche A pour PoC (plus simple, testable immédiatement)

3. Où doit être déclenché le webhook ? Dans le nouvel endpoint POST /api/v1/automation/transfer-request :

Crée le travail TRANSFERT
Appelle le webhook n8n
Retourne immédiatement
4. Qui est responsable de passer le travail à EN_COURS ? Option A (webhook direct) : n8n callback met à jour EN_COURS Option B (via scheduler) : prendreTravaux() met à jour EN_COURS

Recommandation : Pour le PoC, on peut sauter EN_COURS et passer directement de EN_ATTENTE à TERMINE/ECHEC via callback.

5. Qui est responsable de TERMINE ? Le callback n8n en cas de succès.

6. Qui est responsable de ECHEC ? Le callback n8n en cas d'échec définitif (après retries).

7. Comment éviter qu'un même travail soit exécuté deux fois ? La cleIdempotence unique en base protège déjà. Le même travail ne peut pas être créé deux fois.

4. ANALYSE DU TRANSFERT EMAIL
4.1. Comparaison des options
Option A : Récupération par UID IMAP

Avantages : Direct, rapide, UID stable
Inconvénients : UID peut changer si renumérotation serveur
Fiabilité : Moyenne (dépend de la stabilité UID)
Compatibilité : Compatible avec code existant (ConnecteurImap utilise UID)
Pièces jointes : Le connecteur sait lister les métadonnées mais pas télécharger le contenu
Option B : Récupération par Message-ID

Avantages : Message-ID stable par définition
Inconvénients : Recherche IMAP plus lente (SEARCH + FETCH)
Fiabilité : Haute (Message-ID est la norme)
Compatibilité : Compatible, mais nécessite SEARCH IMAP
Pièces jointes : Même problème que A
Option C : Récupération par internetMessageId + transmission contenu

Avantages : MailFlow a déjà les métadonnées
Inconvénients : MailFlow n'a PAS le contenu complet (extrait limité à 4096 octets)
Fiabilité : Faible (contenu incomplet)
Compatibilité : Incompatible avec l'architecture actuelle
Pièces jointes : MailFlow n'a que les métadonnées, pas le contenu
Option D : Récupération IMAP complète via n8n

Avantages : n8n peut récupérer le message complet avec toutes les pièces jointes
Inconvénients : Dépendance IMAP dans n8n
Fiabilité : Haute
Compatibilité : Compatible, séparé de MailFlow
Pièces jointes : n8n nodes IMAP gèrent les pièces jointes
4.2. Recommandation finale
Option D : Récupération IMAP complète via n8n

Justification :

MailFlow ne stocke PAS le contenu complet (extrait 4096 octets max)
MailFlow ne stocke PAS le contenu des pièces jointes
n8n IMAP node peut récupérer le message complet
Séparation claire des responsabilités
Compatible avec l'architecture existante
Implémentation :

MailFlow fournit l'UID (disponible dans Message)
n8n utilise le node IMAP pour récupérer par UID
n8n transmet le message complet via SMTP
5. ANALYSE RIGOUREUSE DU MIME
5.1. Comment MailFlow parse les emails
Analyse de structure MIME (imap.ts - trouverPartieTexte) :



// Ligne 128-182 : Parcours récursif de l'arbre MIME
function trouverPartieTexte(noeud: unknown): { partie, type, encodage, charset } | null {
  // Cherche text/plain d'abord
  if (type === "text/plain" && id) return { partie: id, type, encodage, charset };
  
  // Puis parcourt les enfants
  for (const enfant of childNodes) {
    const t = trouverPartieTexte(enfant);
    if (t) return t;
  }
  
  // Fallback sur HTML si pas de texte brut
  for (const enfant of childNodes) {
    if (type === "text/html" && part) return { partie: id, type
SPÉCIFICATION TECHNIQUE D'IMPLÉMENTATION DU POC MAILFLOW × N8N
3. ANALYSE OBLIGATOIRE DE TravailPlanifie
3.1. Analyse du code existant
Enum TypeTravail (decision.ts lignes 21-26) :



export type TypeTravail =
  | "RELANCE"
  | "ESCALADE"
  | "ARCHIVAGE"
  | "SYNCHRO_BOITE"
  | "RENOUVELLEMENT_ABONNEMENT";
Modèle TravailPlanifie (schema.prisma lignes 561-584) :



model TravailPlanifie {
  id   String      @id @default(cuid())
  type TypeTravail
  echangeId String?
  executerA DateTime
  statut    StatutTravail @default(EN_ATTENTE)  // EN_ATTENTE, EN_COURS, TERMINE, ECHEC, ANNULE
  tentatives     Int @default(0)
  derniereErreur String?
  verrouPar      String?
  verrouA        DateTime?
  charge Json?  // Données nécessaires à l'exécution
  cleIdempotence String @unique
  creeLe    DateTime @default(now())
  termineLe DateTime?
}
Mécanisme de création (exemple SYNCHRO_BOITE dans ordonnanceur.ts lignes 165-174) :



async function planifierCaptation(adresse: string, quand: Date): Promise<void> {
  await prisma.travailPlanifie.create({
    data: {
      type: "SYNCHRO_BOITE",
      executerA: quand,
      charge: { boite: adresse },
      cleIdempotence: `synchro-${adresse}-${quand.toISOString()}`,
    },
  });
}
Mécanisme de prise en charge (ordonnanceur.ts lignes 136-153) :



export async function prendreTravaux(limite: number, identifiant: string): Promise<TravailPris[]> {
  return prisma.$queryRaw<TravailPris[]>`
    UPDATE travail_planifie
       SET statut = 'EN_COURS', verrou_par = ${identifiant}, verrou_a = now()
     WHERE id IN (
       SELECT id
         FROM travail_planifie
        WHERE statut = 'EN_ATTENTE'
          AND executer_a <= now()
        ORDER BY executer_a
        LIMIT ${limite}
        FOR UPDATE SKIP LOCKED
     )
    RETURNING id, type, echange_id, charge, tentatives`;
}
Mécanisme de statut (ordonnanceur.ts lignes 557-566) :



if (r.issue === "execute") {
  await prisma.travailPlanifie.update({
    where: { id: t.id },
    data: {
      statut: "TERMINE",
      termineLe: new Date(),
      verrouPar: null,
      verrouA: null,
    },
  });
}
3.2. Réponses aux questions
1. Peut-on ajouter TRANSFERT sans modifier le scheduler ? ✅ OUI. Le scheduler (ordonnanceur.ts) utilise un switch sur t.type (ligne 426-444). Il suffit d'ajouter un case TRANSFERT qui appelle n8n au lieu d'exécuter une transition locale.

2. Peut-on créer le travail puis appeler n8n directement ? ✅ OUI. Comme pour SYNCHRO_BOITE, on peut créer le travail avec executerA: new Date() (immédiat) et l'ordonnanceur le prendra en charge au prochain cycle. OU on peut créer le travail et appeler n8n directement depuis l'API, en passant le travail à EN_COURS manuellement.

3. Où doit être déclenché le webhook ? ⚠️ DEUX OPTIONS :

Option A : Depuis l'API transfer-request → créer travail → webhook n8n → callback met à jour le travail
Option B : Depuis l'ordonnanceur → travail créé avec executerA: now() → ordonnanceur prend le travail → exécute le webhook n8n
Recommandation : Option A pour le PoC (plus simple, asynchrone immédiat).

4. Qui est responsable de passer le travail à EN_COURS ?

Option A : L'API transfer-request passe le travail à EN_COURS immédiatement après création
Option B : L'ordonnanceur via prendreTravaux() (FOR UPDATE SKIP LOCKED)
Recommandation : Option A pour le PoC (l'API déclenche l'action).

5. Qui est responsable de TERMINE ? Le callback n8n → MailFlow met le travail à TERMINE.

6. Qui est responsable de ECHEC ? Le callback n8n → MailFlow met le travail à ECHEC (après retries n8n épuisés).

7. Comment éviter qu'un même travail soit exécuté deux fois ?

cleIdempotence unique en base
Contrainte Prisma empêche les doublons
Si même clé, erreur de création (à gérer dans l'API)
4. ANALYSE DU TRANSFERT EMAIL
4.1. Comparaison des options
Option A : Récupération par UID IMAP

Avantages : Fiable, UID stable par boîte, rapide
Inconvénients : UID change si renumérotation serveur
Fiabilité : Moyenne (risque renumérotation)
Compatibilité : MailFlow connaît déjà l'UID (stocké dans Message.uid)
Pièces jointes : OK (récupération complète)
Risque : Si message déplacé entre temps
Option B : Récupération par Message-ID

Avantages : Message-ID stable universellement
Inconvénients : Recherche IMAP plus lente (SEARCH)
Fiabilité : Haute
Compatibilité : MailFlow stocke internetMessageId
Pièces jointes : OK
Risque : Message-ID manquant (rare)
Option C : Contenu depuis MailFlow → n8n

Avantages : MailFlow a déjà le message
Inconvénients : MailFlow ne stocke PAS le contenu complet (extrait 4KB)
Fiabilité : Basse (contenu incomplet)
Compatibilité : IMPOSSIBLE (MailFlow ne stocke pas le corps complet)
Pièces jointes : IMPOSSIBLE (MailFlow stocke seulement métadonnées)
Risque : Échec garanti
Option D : MailFlow récupère via IMAP existant → n8n transmet

Avantages : Utilise connecteur IMAP existant
Inconvénients : Couplage fort, duplication de logique
Fiabilité : Haute
Compatibilité : Possible mais complexe
Pièces jointes : OK
Risque : Refactoring nécessaire
4.2. Recommandation finale
Option B : Récupération par Message-ID via n8n

Justification :

Message-ID est stocké dans Message.internetMessageId (unique)
IMAP SEARCH par Message-ID est standard et fiable
MailFlow fournit le Message-ID à n8n
n8n fait la récupération complète (corps + pièces jointes)
Séparation claire des responsabilités
Aucune modification du connecteur IMAP existant
Implémentation :



{
  "messageId": "<original@example.com>",
  "sourceMailbox": "source@example.com"
}
n8n utilise IMAP SEARCH : HEADER Message-ID "<original@example.com>"

5. ANALYSE RIGOUREUSE DU MIME
5.1. Comment MailFlow parse les emails
Analyse de la structure MIME (imap.ts) :

Fonction trouverPartieTexte (lignes 128-182) :

Parcourt l'arborescence MIME récursivement
Cherche d'abord text/plain
Sinon, cherche text/html
Gère les encodages : base64, quoted-printable, 7bit
Gère les charsets : utf-8, iso-8859, windows-125
Fonction listerPiecesJointes (lignes 185-211) :

Parcourt l'arborescence MIME
Détecte disposition: attachment
Détecte les fichiers avec nom mais disposition ≠ inline
Stocke : nom, typeMime, taille
NE
SPÉCIFICATION TECHNIQUE D'IMPLÉMENTATION DU POC
3. ANALYSE OBLIGATOIRE DE TravailPlanifie
3.1. Analyse du code existant
Enum TypeTravail actuel (decision.ts) :



export type TypeTravail =
  | "RELANCE"
  | "ESCALADE"
  | "ARCHIVAGE"
  | "SYNCHRO_BOITE"
  | "RENOUVELLEMENT_ABONNEMENT";
Modèle TravailPlanifie (schema.prisma) :

statut: EN_ATTENTE, EN_COURS, TERMINE, ECHEC, ANNULE
charge: Json (données nécessaires à l'exécution)
cleIdempotence: String @unique
verrouPar, verrouA: pour FOR UPDATE SKIP LOCKED
tentatives: Int @default(0)
derniereErreur: String?
Mécanisme de création (ordonnanceur.ts - planifierCaptation) :



await prisma.travailPlanifie.create({
  data: {
    type: "SYNCHRO_BOITE",
    executerA: quand,
    charge: { boite: adresse },
    cleIdempotence: `synchro-${adresse}-${quand.toISOString()}`,
  },
});
Création directe avec statut EN_ATTENTE (par défaut)
Pas de passage automatique à EN_COURS
Mécanisme de prise en charge (ordonnanceur.ts - prendreTravaux) :



UPDATE travail_planifie
   SET statut = 'EN_COURS', verrou_par = ${identifiant}, verrou_a = now()
 WHERE id IN (
   SELECT id FROM travail_planifie
   WHERE statut = 'EN_ATTENTE' AND executer_a <= now()
   ORDER BY executer_a LIMIT ${limite}
   FOR UPDATE SKIP LOCKED
 )
Passage à EN_COURS par le scheduler (ordonnanceur)
Verrouillage pour éviter les doubles exécutions
Mécanisme de terminaison (ordonnanceur.ts - executerCycle) :



if (r.issue === "execute") {
  await prisma.travailPlanifie.update({
    where: { id: t.id },
    data: { statut: "TERMINE", termineLe: new Date(), verrouPar: null, verrouA: null },
  });
}
3.2. Réponses aux questions
1. Peut-on ajouter TRANSFERT sans modifier le scheduler ?

OUI. Le scheduler (ordonnanceur.ts) utilise un switch/case sur t.type dans executerUn().
MAIS : Pour le PoC, nous ne voulons PAS que le scheduler exécute les transferts.
Solution : Le travail TRANSFERT sera créé en EN_ATTENTE, mais le scheduler le marquera comme "non pris en charge" (case default) et le laissera en EN_ATTENTE.
Alternative : Créer le travail et appeler n8n immédiatement après création, sans passer par le scheduler.
2. Peut-on créer le travail puis appeler n8n directement ?

OUI. C'est l'approche recommandée pour le PoC.
Le workflow : Créer travail → Appeler webhook n8n → n8n traite → callback met à jour le travail.
Le scheduler ignorera les travaux TRANSFERT (case default dans executerUn).
3. Où doit être déclenché le webhook ?

Immédiatement après création du travail dans l'endpoint API /transfer-request.
Le travail est créé avec statut EN_ATTENTE, puis le webhook est appelé.
Le callback n8n mettra le travail à TERMINE ou ECHEC.
4. Qui est responsable de passer le travail à EN_COURS ?

Personne pour le PoC. Le travail restera en EN_ATTENTE pendant le traitement n8n.
Le callback mettra directement à TERMINE ou ECHEC.
Alternative : Le webhook n8n pourrait mettre à EN_COURS dès réception, mais ce n'est pas nécessaire pour le PoC.
5. Qui est responsable de TERMINE ?

Le callback n8n (endpoint /transfer-callback).
Quand n8n confirme le succès, le callback met le travail à TERMINE.
6. Qui est responsable de ECHEC ?

Le callback n8n (endpoint /transfer-callback).
Quand n8n signale un échec définitif, le callback met le travail à ECHEC.
7. Comment éviter qu'un même travail soit exécuté deux fois ?

cleIdempotence unique en base : Empêche la création du même travail deux fois.
Vérification dans le callback : Si le travail est déjà TERMINE, ignorer le callback.
HMAC + timestamp : Empêche les replays de webhooks malveillants.
4. ANALYSE DU TRANSFERT EMAIL
4.1. Comparaison des options
Option A : Récupération par UID IMAP

Avantages :
Fiable et rapide (accès direct par UID)
Compatible avec le code existant (ConnecteurImap utilise déjà les UID)
Le UID est déjà stocké dans MessageCanonique
Inconvénients :
Le UID peut changer si la boîte est renumérotée (rare mais possible)
Dépendance à la boîte source restant accessible
Fiabilité : Haute (avec gestion de la renumérotation)
Compatibilité : Excellente (code existant)
Gestion pièces jointes : Excellente (ConnecteurImap gère déjà MIME)
Option B : Récupération par Message-ID

Avantages :
Message-ID est stable et universel
Indépendant de la boîte
Inconvénients :
Nécessite une recherche IMAP (plus lent que l'accès direct par UID)
Certains serveurs IMAP ne supportent pas bien la recherche par header
Fiabilité : Moyenne (dépend de la capacité de recherche du serveur)
Compatibilité : Moyenne (pas utilisé dans le code actuel)
Gestion pièces jointes : Excellente (si le message est trouvé)
Option C : Récupération par internetMessageId dans MailFlow + transmission du contenu

Avantages :
MailFlow a déjà accès au message (via captation)
Pas de dépendance IMAP dans n8n
Contenu déjà parsé et normalisé
Inconvénients :
MailFlow ne stocke PAS le contenu complet (seulement l'extrait de 4096 caractères)
Les pièces jointes ne sont PAS stockées (seulement les métadonnées)
Reconstruction MIME impossible depuis les données MailFlow
Fiabilité : Basse (données incomplètes)
Compatibilité : Impossible (données manquantes)
Gestion pièces jointes : Impossible (contenu non stocké)
Option D : Nouvelle approche - Récupération IMAP par UID avec fallback Message-ID

Avantages :
Fiable (accès direct par UID)
Robuste (fallback par Message-ID si UID invalide)
Compatible avec le code existant
Inconvénients :
Plus complexe à implémenter
Fiabilité : Très haute
Compatibilité : Excellente
4.2. Recommandation finale
Option A (Récupération par UID IMAP) pour le PoC

Justification :

Le code existant (ConnecteurImap) utilise déjà les UID
Le UID est disponible dans MessageCanonique
Fiabilité élevée pour un PoC
Compatible avec l'architecture existante
Les pièces jointes sont correctement gérées par le connecteur existant
Implémentation :

MailFlow passe le UID dans la charge du travail
n8n utilise le node IMAP pour récupérer le message par UID
En cas d'échec (UID invalide), n8n retourne une erreur (MailFlow créera un nouveau travail avec le Message-ID comme fallback en phase 2)
5. ANALYSE RIGOUREUSE DU MIME
5.1. Analyse du code existant
Parsing MIME (imap.ts) :

Fonction trouverPartieTexte (lignes 128-182) :

Parcourt l'arborescence MIME
Cherche d'abord text/plain
Fallback sur text/html si pas de texte brut
Gère les encodages : base64, quoted-printable, 7bit
Gère les charsets : utf-8, iso-8859, windows-125
Fonction listerPiecesJointes (lignes 185-211) :

Parcourt l'arborescence MIME
Détecte disposition: attachment
Détecte les fichiers avec nom (même si disposition != attachment)
Stocke : nom, typeMime, taille
Ne stocke PAS le contenu (seulement les métadonnées)
Fonction convertir (lignes 331-363) :

Crée MessageCanonique depuis le message IMAP brut
Extrait : Message-ID, In-Reply-To, References
Extrait les métadonnées des pièces jointes
Ne conserve PAS le contenu MIME complet
Stockage dans la base (schema.prisma) :

Message.extrait : String (aperçu, pas le contenu complet)
PieceJointe : métadonnées SEULEMENT (nom, typeMime, taille, empreinte)
Le contenu réel des pièces jointes n'est PAS stocké
5.2. Capacités de MailFlow
Ce que MailFlow PEUT faire :

Parser la structure MIME
Identifier les pièces jointes
Extraire un aperçu du corps (limité à 4096 caractères)
Normaliser les headers
Ce que MailFlow NE peut PAS faire :

Reconstruire un message MIME complet
Fournir le contenu binaire des pièces jointes
Fournir le corps HTML complet
Fournir le corps texte complet
5.3. Implications pour n8n
n8n DOIT :

Récupérer le message complet depuis IMAP
Parser la structure MIME lui-même
Reconstruire le message pour l'envoi SMTP
Gérer les encodages (base64, quoted-printable)
Gérer les charsets
Gérer les différentes parties MIME
n8n NE PEUT PAS :

Recevoir le contenu complet depuis MailFlow (données manquantes)
Reconstruire le message depuis les données MailFlow
5.4. Recommandation
n8n doit récupérer le message complet depuis IMAP

MailFlow ne peut pas fournir le contenu nécessaire. La reconstruction MIME dans n8n est nécessaire et faisable avec les nodes n8n existants (IMAP node + SMTP node).

6. MESSAGE-ID ET THREADING
6.1. Analyse des scénarios
Scénario 1 : Transfert simple

Original :



Message-ID: <original@example.com>
Transfert :



Message-ID: <transfer@mailflow-transfer>
In-Reply-To: <original@example.com>
References: <original@example.com>
X-MailFlow-Type: transfer
X-MailFlow-Original-Message-ID: <original@example.com>
X-MailFlow-Exchange-Id: clxxxxxxx
Scénario 2 : Réponse depuis B

Réponse :



Message-ID: <reponse-dest@example.com>
In-Reply-To: <transfer@mailflow-transfer>
References: <original@example.com> <transfer@mailflow-transfer>
6.2. Analyse des headers nécessaires
Headers obligatoires pour le threading MailFlow :

In-Reply-To : Utilisé par rattacher() (priorité 1)
References : Utilisé par rattacher() (priorité 2, parcouru à l'envers)
Message-ID : Utilisé pour l'unicité en base
Headers MailFlow spécifiques :

X-MailFlow-Type : Utilisé pour exclure les messages générés par MailFlow
X-MailFlow-Original-Message-ID : NOUVEAU - pour rattacher les transferts
X-MailFlow-Exchange-Id : NOUVEAU - pour traçabilité
6.3. Classification des headers
Headers à CONSERVER (copiés de l'original) :

In-Reply-To
References
Subject
Content-Type
MIME-Version
Tous les headers standards RFC 5322
Headers à MODIFIER :

Message-ID (doit changer pour le transfert)
From (doit être l'expéditeur original)
To (doit être la destination)
Date (doit être la date du transfert)
Headers à AJOUTER :

X-MailFlow-Type: transfer
X-MailFlow-Original-Message-ID:
X-MailFlow-Exchange-Id:
X-MailFlow-Transfer-Timestamp:
Headers à INTERDIRE de duplication :

Received (ne pas copier les headers Received de l'original)
Return-Path (regénéré par SMTP)
DKIM-Signature (doit être regénéré ou supprimé)
6.4. Algorithme de rattachement amélioré
Dans traiterSortant() (captation.ts) :



// AVANT l'exclusion MailFlow
if (m.estGenereParMailflow) return false;
 
// NOUVEAU : Détection des transferts
if (estTransfertMailflow(entetes)) {
  const originalId = entetes.get("x-mailflow-original-message-id");
  if (originalId) {
    const original = await prisma.message.findUnique({
      where: { internetMessageId: originalId }
    });
    if (original) {
      // Rattachement direct à l'échange original
      echangeId = original.echangeId;
      // Continuer vers le traitement normal (création message, transition)
    }
  }
  // Si pas d'original trouvé, continuer avec l'algorithme normal
}
 
// Puis algorithme normal (In-Reply-To, References)
Nouvelle fonction dans normalisation.ts :



export function estTransfertMailflow(entetes: Map<string, string>): boolean {
  return entetes.get("x-mailflow-type") === "transfer";
}
7. CAS CRITIQUE : SMTP OK MAIS CALLBACK PERDU
7.1. Scénario


MailFlow → n8n (webhook)
n8n → IMAP (récupération)
n8n → SMTP (envoi réussi)
B reçoit l'email
n8n CRASH avant callback
MailFlow pense : travail EN_ATTENTE
7.2. Problèmes
Double envoi possible : Si MailFlow recrée le travail ou appelle n8n à nouveau
Incohérence DB : Le travail reste EN_ATTENTE alors que le transfert a réussi
Pas de traçabilité : L'événement de succès n'est pas journalisé
7.3. Stratégie de récupération
Solution 1 : Idempotence côté n8n

n8n doit maintenir un cache (en mémoire ou Redis) des requêtes traitées :

Clé : idempotency key
Valeur : résultat (succès/échec + externalMessageId)
TTL : 24 heures
Si le même webhook est reçu à nouveau :

Vérifier le cache
Si trouvé : retourner le résultat précédent immédiatement
Si non trouvé : traiter normalement
Solution 2 : Vérification côté MailFlow (callback)

Dans le callback /transfer-callback :



const travail = await prisma.travailPlanifie.findUnique({
  where: { id: travailId }
});
 
if (!travail) {
  // Travail introuvable : peut-être déjà supprimé ou jamais créé
  return { acknowledged: false, error: "Travail introuvable" }
}
 
if (travail.statut === "TERMINE") {
  // Déjà terminé : ignorer le callback (idempotence)
  return { acknowledged: true, note: "Déjà terminé" }
}
 
if (travail.statut === "ECHEC") {
  // Déjà en échec : ignorer le callback
  return { acknowledged: true, note: "Déjà en échec" }
}
 
// Si EN_ATTENTE ou EN_COURS : traiter normalement
Solution 3 : Réconciliation périodique (optionnelle pour phase 2)

Un job périodique (ex: toutes les heures) vérifie :

Les travaux TRANSFERT en EN_ATTENTE depuis plus de X minutes
Envoie un ping à n8n pour demander le statut
Met à jour en conséquence
Pour le PoC : Solutions 1 et 2 suffisent

7.4. Stratégie finale
Idempotence n8n : Cache en mémoire (TTL 1h)
Idempotence MailFlow : Vérification du statut dans le callback
Pas de nouvelle table : Utiliser TravailPlanifie existant
Pas de réconciliation automatique : Pour le PoC, accepter qu'un travail puisse rester EN_ATTENTE en cas de crash (intervention manuelle si nécessaire)
8. IDEMPOTENCE
8.1. Analyse de la clé proposée
Clé proposée : echangeId-transfer-messageIdOriginal

Scénarios de test :

A. Même webhook deux fois

MailFlow : cleIdempotence unique → erreur Prisma au 2ème appel
Résultat : ✅ Un seul travail créé
B. Même message transféré deux fois

MailFlow : Même clé → erreur Prisma
Résultat : ✅ Un seul travail créé
C. n8n redémarre après réception

n8n : Cache en mémoire perdu
MailFlow : Travail déjà EN_ATTENTE
Action : n8n reçoit le même webhook (même idempotency key)
n8n : Doit détecter le doublon (pas implémenté par défaut)
Résultat : ⚠️ Risque de double traitement si n8n n'a pas de cache
D. n8n redémarre après SMTP

n8n : SMTP déjà réussi, mais callback pas envoyé
MailFlow : Travail EN_ATTENTE
Action : n8n redémarre, reçoit un nouveau webhook (MailFlow retente)
n8n : Si pas de cache → risque de double envoi
Résultat : ⚠️ Risque de double envoi
E. MailFlow redémarre après webhook

MailFlow : Le travail existe déjà en base
Action : Nouvelle tentative d'appel webhook
n8n : Reçoit le même webhook
Résultat : ✅ Si n8n a un cache, pas de problème
F. Callback reçu deux fois

MailFlow : Vérifie le statut du travail
Si TERMINE : Ignore le 2ème callback
Si EN_ATTENTE : Traite normalement
Résultat : ✅ Idempotence côté MailFlow
G. Callback reçu après ECHEC

MailFlow : Vérifie le statut
Si ECHEC : Ignore le callback
Résultat : ✅ Idempotence côté MailFlow
H. Transfert réussi mais réponse HTTP perdue

n8n : SMTP réussi, mais réponse HTTP au callback perdue
MailFlow : Ne sait pas que le transfert a réussi
Travail : Reste EN_ATTENTE
Résultat : ⚠️ Incohérence (acceptée pour le PoC)
8.2. Clé améliorée
Clé recommandée : ${echangeId}-transfer-${messageIdOriginal}-${destinationMailbox}

Justification :

echangeId : Identifie l'échange
transfer : Type d'opération
messageIdOriginal : Identifie le message source
destinationMailbox : Permet le même message vers plusieurs destinations
8.3. Stratégie finale
Niveau 1 : MailFlow (base de données)

cleIdempotence unique en base
Format : ${echangeId}-transfer-${messageIdOriginal}-${destinationMailbox}
Niveau 2 : n8n (cache)

Cache en mémoire (Map) avec TTL 1h
Clé : idempotency key du payload
Valeur : { success, externalMessageId, timestamp }
Niveau 3 : MailFlow (callback)

Vérification du statut du travail avant traitement
Si TERMINE ou ECHEC : ignorer
Niveau 4 : MailFlow (webhook)

Try/catch autour de l'appel webhook n8n
Si échec HTTP : le travail reste EN_ATTENTE (sera retenté par un job ultérieur en phase 2)
9. ANTI-BOUCLE
9.1. Scénarios de boucle
A → B

Transfert A → B
B transfère vers C
✅ Pas de boucle
B → A

Transfert B → A
A transfère vers B
⚠️ Boucle A → B → A
A → B → A

Transfert A → B
B transfère vers A
A transfère vers B
⚠️ Boucle infinie
9.2. Mécanismes de prévention
Mécanisme 1 : X-MailFlow-Type



// Dans traiterSortant()
if (estTransfertMailflow(entetes)) {
  // Ne pas traiter un transfert comme une réponse
  return false;
}
Problème : Empêche de détecter une réponse RÉELLE depuis B (le message de réponse ne porte pas X-MailFlow-Type).

Mécanisme 2 : X-MailFlow-Transfer-Chain



X-MailFlow-Transfer-Chain: source@example.com → dest@example.com


const chain = entetes.get("x-mailflow-transfer-chain");
if (chain && chain.includes(currentMailbox)) {
  return false; // Boucle détectée
}
Problème : Nécessite de modifier le header à chaque transfert.

Mécanisme 3 : Whitelist



const destinationsAutorisees = ["dest1@example.com", "dest2@example.com"];
if (!destinationsAutorisees.includes(destinationMailbox)) {
  throw new Error("Destination non autorisée");
}
Problème : Ne prévient pas les boucles si A et B sont tous deux dans la whitelist.

Mécanisme 4 : Association exchangeId



// Vérifier si l'échange a déjà été transféré
const dejaTransfere = await prisma.travailPlanifie.findFirst({
  where: {
    echangeId,
    type: "TRANSFERT",
    statut: "TERMINE"
  }
});
if (dejaTransfere) {
  throw new Error("Échange déjà transféré");
}
Problème : Empêche les transferts multiples (vers plusieurs destinations), ce qui peut être légitime.

9.3. Mécanisme minimal pour le PoC
Combinaison : Whitelist + Vérification exchangeId



// 1. Whitelist des destinations
const destinationsAutorisees = ["dest@example.com"];
if (!destinationsAutorisees.includes(destinationMailbox)) {
  throw new Error("Destination non autorisée");
}
 
// 2. Vérification : un seul transfert par échange (pour le PoC)
const dejaTransfere = await prisma.travailPlanifie.findFirst({
  where: {
    echangeId,
    type: "TRANSFERT",
    statut: { in: ["EN_ATTENTE", "EN_COURS", "TERMINE"] }
  }
});
if (dejaTransfere) {
  throw new Error("Échange déjà en cours de transfert ou transféré");
}
Pour le PoC : Cette combinaison suffit car :

On teste avec seulement 2 boîtes (A et B)
On n'autorise que B comme destination
On n'a pas besoin de transferts multiples
Pour la production : Ajouter X-MailFlow-Transfer-Chain pour gérer les cas complexes.

10. N8N : VALIDATION RÉELLE DES NODES
10.1. Validation des capacités n8n
1. Webhook

✅ Disponible : Webhook node natif
Configuration : POST, path, authentication
2. Validation HMAC

✅ Disponible : Function node (Code) avec crypto
Implémentation : Node JavaScript avec module crypto
3. Validation payload

✅ Disponible : Function node (Code)
Implémentation : Validation JavaScript
4. Récupération IMAP

✅ Disponible : IMAP node natif
Configuration : Credentials, dossier, action (Fetch by UID)
5. Récupération du contenu complet

✅ Disponible : IMAP node avec option "Fetch Full Message"
Implémentation : IMAP node supporte le téléchargement complet
6. Récupération des pièces jointes

✅ Disponible : IMAP node extrait les pièces jointes
Implémentation : Les pièces jointes sont disponibles dans la sortie du node
7. Construction MIME

⚠️ PARTIELLEMENT DISPO : SMTP node peut construire des messages, mais la reconstruction exacte du MIME depuis un message IMAP peut être complexe
Alternative : Utiliser le node "Send Email" avec les données brutes du message IMAP
8. SMTP

✅ Disponible : SMTP node natif (Send Email)
Configuration : Credentials, from, to, subject, body, attachments
9. Définition Message-ID

✅ Disponible : SMTP node permet de définir un Message-ID personnalisé
Implémentation : Option "Custom Message ID" dans le node SMTP
10. Définition In-Reply-To

✅ Disponible : SMTP node permet d'ajouter des headers personnalisés
Implémentation : Option "Custom Headers" dans le node SMTP
11. Définition References

✅ Disponible : SMTP node permet d'ajouter des headers personnalisés
Implémentation : Option "Custom Headers" dans le node SMTP
12. Ajout X-MailFlow-*

✅ Disponible : SMTP node permet d'ajouter des headers personnalisés
Implémentation : Option "Custom Headers" dans le node SMTP
13. Callback

✅ Disponible : HTTP Request node
Implémentation : POST vers l'endpoint MailFlow
14. Retry

✅ Disponible : Error Workflow natif
Implémentation : Error Trigger avec retry logic
15. Reprise après redémarrage

⚠️ PARTIELLEMENT DISPO : n8n perd l'état en mémoire au redémarrage
Solution : Utiliser le cache externe (Redis) ou accepter la perte (pour le PoC)
10.2. Problème identifié : Reconstruction MIME
Le node SMTP de n8n peut construire un message, mais reconstruire EXACTEMENT le MIME d'un message existant est complexe.

Alternative simplifiée pour le PoC :

Récupérer le message complet depuis IMAP
Utiliser le node "Send Email" avec :
from : expéditeur original
to : destination
subject : sujet original
text : corps texte (extrait par IMAP)
html : corps HTML (extrait par IMAP)
attachments : pièces jointes (extraites par IMAP)
custom headers : In-Reply-To, References, X-MailFlow-*
Limitation : La reconstruction MIME ne sera pas EXACTEMENT identique à l'original, mais sera fonctionnelle pour le PoC.

11. API MAILFLOW
11.1. Endpoint POST /api/v1/automation/transfer-request
Headers :



Content-Type: application/json
X-MailFlow-Signature: HMAC-SHA256(secret, body)
X-MailFlow-Timestamp: 2026-09-10T10:00:00Z
X-MailFlow-Idempotency-Key: uuid
Payload :



{
  "exchangeId": "clxxxxxxx",
  "messageId": "<original@example.com>",
  "sourceMailbox": "source@example.com",
  "destinationMailbox": "dest@example.com",
  "uid": 12345,
  "requestedAt": "2026-09-10T10:00:00Z"
}
Validation :

HMAC-SHA256
Timestamp (max 5 minutes)
Idempotency key (format UUID)
Champs obligatoires : exchangeId, messageId, sourceMailbox, destinationMailbox
Format email (regex)
Existence de l'échange en base
Destination autorisée (whitelist)
Comportement :

Vérifier l'idempotency key (cleIdempotence unique en base)
Créer le travail TRANSFERT
Appeler le webhook n8n
Retourner immédiatement (async)
Réponses HTTP :

200 OK : Travail créé, webhook envoyé
400 Bad Request : Payload invalide
409 Conflict : Idempotency key déjà utilisée
404 Not Found : Échange introuvable
403 Forbidden : Destination non autorisée
500 Internal Server Error : Erreur serveur
En cas de doublon (idempotency key déjà utilisée) :

Retourner 409 avec le statut du travail existant
En cas de replay (timestamp trop ancien) :

Retourner 400 avec erreur "Request too old"
11.2. Endpoint POST /api/v1/automation/transfer-callback
Headers :



Content-Type: application/json
X-N8N-Signature: HMAC-SHA256(secret, body)
X-N8N-Timestamp: 2026-09-10T10:00:05Z
Payload succès :



{
  "requestId": "n8n-workflow-uuid",
  "exchangeId": "clxxxxxxx",
  "success": true,
  "externalMessageId": "<transferred@mailflow-transfer>",
  "timestamp": "2026-09-10T10:00:05Z"
}
Payload échec :



{
  "requestId": "n8n-workflow-uuid",
  "exchangeId": "clxxxxxxx",
  "success": false,
  "error": {
    "code": "SMTP_ERROR",
    "message": "Description",
    "retryable": true
  },
  "timestamp": "2026-09-10T10:00:05Z"
}
Validation :

HMAC-SHA256
Timestamp (max 5 minutes)
Champs obligatoires : requestId, exchangeId, success
Existence du travail en base
Correspondance exchangeId
Comportement :

Vérifier le statut du travail
Si TERMINE ou ECHEC : ignorer (idempotence)
Si EN_ATTENTE : mettre à jour selon le callback
Créer un événement
Réponses HTTP :

200 OK : Callback traité
400 Bad Request : Payload invalide
404 Not Found : Travail introuvable
500 Internal Server Error : Erreur serveur
Codes d'erreur :

SMTP_ERROR : Erreur SMTP
IMAP_ERROR : Erreur IMAP
VALIDATION_ERROR : Erreur de validation
TIMEOUT_ERROR : Timeout
12. TRAVAIL TRANSFERT
12.1. Structure de la charge


{
  exchangeId: string;      // OBLIGATOIRE - Identifiant de l'échange
  messageId: string;       // OBLIGATOIRE - Message-ID original
  sourceMailbox: string;   // OBLIGATOIRE - Boîte source
  destinationMailbox: string; // OBLIGATOIRE - Boîte destination
  uid: number;             // OBLIGATOIRE - UID IMAP du message
  requestedAt: string;     // ISO8601 - Timestamp de la demande
}
12.2. Champs nécessaires
OBLIGATOIRES :

exchangeId : Pour rattacher le travail à l'échange
messageId : Pour l'idempotence et le rattachement
sourceMailbox : Pour que n8n sache quelle boîte IMAP utiliser
destinationMailbox : Pour que n8n sache où envoyer
uid : Pour que n8n puisse récupérer le message par UID
OPTIONNELS :

requestedAt : Pour traçabilité (peut être déduit de creeLe)
12.3. cleIdempotence
Format : ${exchangeId}-transfer-${messageId}-${destinationMailbox}

Exemple : clabc123-transfer-<original@example.com>-dest@example.com

13. ÉVÉNEMENTS
13.1. Analyse des événements existants
Enum TypeEvenement (schema.prisma) :



enum TypeEvenement {
  MAIL_DETECTE
  MAIL_ENREGISTRE
  MAIL_QUALIFIE
  MAIL_ATTRIBUE
  MAIL_TRANSMIS
  MAIL_REQUALIFIE
  RELANCE_ENVOYEE
  RELANCE_REPORTEE
  RELANCE_ECHEC
  REPONSE_DETECTEE
  REPONSE_DECLAREE
  ESCALADE_DECLENCHEE
  ECHANGE_CLOS
  MAIL_ARCHIVE
  PARAMETRE_MODIFIE
  REGLE_MODIFIE
  UTILISATEUR_MODIFIE
  ANOMALIE_TECHNIQUE
}
13.2. Événements nécessaires
Pour le PoC, réutiliser les événements existants :

TRANSFERT_DEMANDE → ANOMALIE_TECHNIQUE (avec libelle spécifique)
TRANSFERT_REUSSI → ANOMALIE_TECHNIQUE (avec libelle spécifique)
TRANSFERT_ECHEC → ANOMALIE_TECHNIQUE (avec libelle spécifique)
Justification :

Pas de modification du schéma Prisma
Le champ libelle de Evenement permet de décrire précisément l'action
ANOMALIE_TECHNIQUE est déjà utilisé pour les incidents techniques
Exemples de libellés :

"Transfert demandé vers dest@example.com"
"Transfert réussi vers dest@example.com (Message-ID: <transferred@...>)"
"Transfert échoué vers dest@example.com : SMTP_ERROR"
14. PLAN DE MODIFICATION EXACT
14.1. Fichiers à créer
Fichier	Description	Nécessité
src/app/api/v1/automation/transfer-request/route.ts	Endpoint POST pour recevoir les demandes de transfert	OBLIGATOIRE
src/app/api/v1/automation/transfer-callback/route.ts	Endpoint POST pour recevoir les callbacks n8n	OBLIGATOIRE
normalisation.ts (ajout fonction)	Fonction estTransfertMailflow()	OBLIGATOIRE
14.2. Fichiers à modifier
Fichier	Modification	Nécessité	Risque	Justification
captation.ts	Ajouter détection des transferts dans traiterSortant()	OBLIGATOIRE	FAIBLE	Extension de l'algorithme existant, pas de refactoring
schema.prisma	Ajouter TRANSFERT à l'enum TypeTravail	OBLIGATOIRE	FAIBLE	Simple ajout à un enum, pas de migration complexe
decision.ts	Ajouter TRANSFERT au type TypeTravail	OBLIGATOIRE	FAIBLE	Simple ajout à un type, pas de logique métier
.env	Ajouter variables d'environnement n8n	OBLIGATOIRE	NUL	Configuration uniquement
14.3. Fichiers à NE PAS toucher
Fichier	Raison
cycle-echange.ts	Moteur métier intact
relance.ts	Moteur métier intact
echeance.ts	Moteur métier intact
ordonnanceur.ts	Scheduler intact (seulement case default pour TRANSFERT)
decision.ts (sauf ajout TypeTravail)	Logique de décision intacte
imap.ts	Connecteur intact
envoi.ts	Connecteur intact
executer.ts	Exécution intacte
captation.ts (sauf ajout détection transfert)	Captation intacte
14.4. Détail des modifications
Modification 1 : captation.ts

Emplacement : Fonction traiterSortant(), ligne 333

Avant :



if (m.estGenereParMailflow) return false;
Après :



if (m.estGenereParMailflow) return false;
 
// NOUVEAU : Détection des transferts MailFlow
if (estTransfertMailflow(entetes)) {
  const originalId = entetes.get("x-mailflow-original-message-id");
  if (originalId) {
    const original = await prisma.message.findUnique({
      where: { internetMessageId: originalId }
    });
    if (original) {
      echangeId = original.echangeId;
      // Continuer vers le traitement normal
    }
  }
  // Si pas d'original trouvé, continuer avec l'algorithme normal
}
Impact : Aucun impact sur le workflow existant. Ajout d'une détection supplémentaire.

Modification 2 : normalisation.ts

Emplacement : Fin du fichier

Ajout :



export function estTransfertMailflow(entetes: Map<string, string>): boolean {
  return entetes.get("x-mailflow-type") === "transfer";
}
Impact : Aucun impact. Nouvelle fonction pure.

Modification 3 : schema.prisma

Emplacement : Enum TypeTravail, ligne 90-97

Avant :



enum TypeTravail {
  RELANCE
  VERIFICATION_REPONSE
  ESCALADE
  ARCHIVAGE
  SYNCHRO_BOITE
  RENOUVELLEMENT_ABONNEMENT
}
Après :



enum TypeTravail {
  RELANCE
  VERIFICATION_REPONSE
  ESCALADE
  ARCHIVAGE
  SYNCHRO_BOITE
  RENOUVELLEMENT_ABONNEMENT
  TRANSFERT
}
Impact : Aucun impact sur les données existantes. Migration Prisma automatique.

Modification 4 : decision.ts

Emplacement : Type TypeTravail, ligne 21-26

Avant :



export type TypeTravail =
  | "RELANCE"
  | "ESCALADE"
  | "ARCHIVAGE"
  | "SYNCHRO_BOITE"
  | "RENOUVELLEMENT_ABONNEMENT";
Après :



export type TypeTravail =
  | "RELANCE"
  | "ESCALADE"
  | "ARCHIVAGE"
  | "SYNCHRO_BOITE"
  | "RENOUVELLEMENT_ABONNEMENT"
  | "TRANSFERT";
Impact : Aucun impact. Ajout au type TypeScript.

15. PLAN N8N FINAL
15.1. Workflow complet


[1. Webhook Trigger]
   ↓
[2. Function: Validation HMAC]
   ↓
[3. Function: Validation Payload]
   ↓
[4. IMAP: Fetch Message by UID]
   ↓
[5. Function: Prepare Headers]
   ↓
[6. Function: Prepare SMTP Options]
   ↓
[7. SMTP: Send Email]
   ↓
[8. Respond to Webhook]
   ↓
[9. HTTP Request: Callback MailFlow]
   ↓
[10. Error Trigger]
   ↓
[11. Function: Error Handler]
15.2. Détail des nodes
Node 1: Webhook Trigger

Type : Webhook
Method : POST
Path : /mailflow-transfer
Authentication : None
Input : Payload JSON brut
Output : Payload JSON
Node 2: Function: Validation HMAC

Type : Function
Code :


const crypto = require('crypto');
const secret = $env.N8N_WEBHOOK_SECRET;
const receivedSig = $input.item.json.headers['X-MailFlow-Signature'];
const timestamp = $input.item.json.headers['X-MailFlow-Timestamp'];
const body = JSON.stringify($input.item.json.body);
 
// Vérifier timestamp
const now = new Date();
const requestTime = new Date(timestamp);
if (now - requestTime > 5 * 60 * 1000) {
  throw new Error('Request too old');
}
 
// Vérifier signature
const computedSig = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');
 
if (receivedSig !== computedSig) {
  throw new Error('Invalid signature');
}
 
return $input.item.json.body;
Output : Payload validé
Errors : Invalid signature, Request too old
Node 3: Function: Validation Payload

Type : Function
Code :


const required = ['exchangeId', 'messageId', 'sourceMailbox', 'destinationMailbox', 'uid'];
for (const field of required) {
  if (!$json[field]) {
    throw new Error(`Missing required field: ${field}`);
  }
}
 
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test($json.sourceMailbox) || !emailRegex.test($json.destinationMailbox)) {
  throw new Error('Invalid email format');
}
 
return $json;
Output : Payload validé
Errors : Missing required field, Invalid email format
Node 4: IMAP: Fetch Message by UID

Type : IMAP
Credentials : ${$json.sourceMailbox}
Operation : Fetch
Folder : INBOX
UID : ${$json.uid}
Options : Fetch Full Message
Output : Message complet (headers + body + attachments)
Errors : Message not found, IMAP connection error
Node 5: Function: Prepare Headers

Type : Function
Code :


const message = $json.imapMessage;
const originalHeaders = message.headers;
const originalMessageId = originalHeaders['message-id'];
 
const preservedHeaders = {
  'in-reply-to': originalHeaders['in-reply-to'],
  'references': originalHeaders['references'],
  'subject': originalHeaders['subject']
};
 
const newHeaders = {
  'x-mailflow-type': 'transfer',
  'x-mailflow-original-message-id': originalMessageId,
  'x-mailflow-exchange-id': $json.exchangeId,
  'x-mailflow-transfer-timestamp': new Date().toISOString()
};
 
return {
  originalMessageId,
  preservedHeaders,
  newHeaders,
  subject: originalHeaders['subject'],
  text: message.text,
  html: message.html,
  attachments: message.attachments
};
Output : Headers préparés + contenu
Errors : Missing headers
Node 6: Function: Prepare SMTP Options

Type : Function
Code :


const { preservedHeaders, newHeaders, subject, text, html, attachments } = $json;
 
const newMessageId = `<mailflow-transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@mailflow-transfer>`;
 
const mailOptions = {
  from: $json.sourceMailbox,
  to: $json.destinationMailbox,
  messageId: newMessageId,
  subject: subject,
  text: text,
  html: html,
  attachments: attachments,
  headers: {
    ...preservedHeaders,
    ...newHeaders,
    'message-id': newMessageId
  }
};
 
return {
  mailOptions,
  newMessageId,
  originalMessageId: $json.originalMessageId
};
Output : Options SMTP complètes
Errors : None
Node 7: SMTP: Send Email

Type : Send Email
Credentials : SMTP server
From : ${$json.sourceMailbox}
To : ${$json.destinationMailbox}
Subject : ${$json.mailOptions.subject}
Message ID : ${$json.newMessageId}
Text : ${$json.mailOptions.text}
HTML : ${$json.mailOptions.html}
Attachments : ${$json.mailOptions.attachments}
Custom Headers : ${$json.mailOptions.headers}
Output : Résultat envoi + Message-ID
Errors : SMTP error, Authentication error
Node 8: Respond to Webhook

Type : Respond to Webhook
Response :


{
  "accepted": true,
  "requestId": "{{$json.workflowId}}",
  "estimatedCompletion": "{{$json.now + 30000}}"
}
Output : HTTP 200
Node 9: HTTP Request: Callback MailFlow

Type : HTTP Request
Method : POST
URL : ${$env.MAILFLOW_API_URL}/api/v1/automation/transfer-callback
Authentication : None
Headers :
Content-Type: application/json
X-N8N-Signature: HMAC-SHA256(secret, body)
X-N8N-Timestamp: ISO8601
Body :


{
  "requestId": "{{$json.workflowId}}",
  "exchangeId": "{{$json.exchangeId}}",
  "success": true,
  "externalMessageId": "{{$json.newMessageId}}",
  "timestamp": "{{$json.now}}"
}
Output : Réponse MailFlow
Errors : MailFlow unavailable (non-blocking)
Node 10: Error Trigger

Type : Error Trigger
Error Types : All errors
Node 11: Function: Error Handler

Type : Function
Code :


const error = $json.error;
const retryable = ['ETIMEDOUT', 'ECONNRESET', 'ESMTPTimeout'].includes(error.code);
 
if (retryable && $json.retryCount < 3) {
  return {
    retry: true,
    wait: Math.pow(2, $json.retryCount) * 60 * 1000
  };
}
 
// Échec définitif - callback MailFlow
return {
  callback: {
    url: $env.MAILFLOW_CALLBACK_URL,
    body: {
      requestId: $json.workflowId,
      exchangeId: $json.exchangeId,
      success: false,
      error: {
        code: error.code,
        message: error.message,
        retryable: retryable
      }
    }
  }
};
Output : Retry ou callback échec
16. PLAN DE TEST DU POC
16.1. Tests existants (améliorés)
TEST A : Email simple

Préparation : Envoyer email texte brut vers boîte A
Action : Qualifier l'échange, déclencher transfert
Résultat attendu : Email reçu dans B, corps texte conservé
Données DB : Travail TRANSFERT créé, statut TERMINE
Headers : X-MailFlow-Type: transfer, X-MailFlow-Original-Message-ID présent
TEST B : Email HTML

Préparation : Envoyer email HTML vers boîte A
Action : Qualifier l'échange, déclencher transfert
Résultat attendu : Email reçu dans B, HTML conservé
Headers : Content-Type: text/html conservé
TEST C : Email avec pièce jointe

Préparation : Envoyer email avec 1 PDF vers boîte A
Action : Qualifier l'échange, déclencher transfert
Résultat attendu : Email reçu dans B, pièce jointe conservée
Vérification : Hash SHA-256 identique
TEST D : Email avec plusieurs pièces jointes

Préparation : Envoyer email avec 3 pièces jointes vers boîte A
Action : Qualifier l'échange, déclencher transfert
Résultat attendu : Email reçu dans B, toutes pièces jointes conservées
TEST E : Email avec In-Reply-To

Préparation : Envoyer réponse vers boîte A
Action : Qualifier l'échange, déclencher transfert
Résultat attendu : In-Reply-To conservé dans le transfert
TEST F : Email avec References

Préparation : Envoyer email avec chaîne References vers boîte A
Action : Qualifier l'échange, déclencher transfert
Résultat attendu : References conservé dans le transfert
TEST G : Réponse depuis B

Préparation : Transférer email vers B
Action : Répondre depuis B
Résultat attendu : Réponse détectée, rattachée à l'échange original
Données DB : Statut REPONDU, relances arrêtées
TEST H : Deuxième réponse depuis B

Préparation : Transférer email vers B
Action : Répondre deux fois depuis B
Résultat attendu : Les deux réponses détectées, rattachées au même échange
TEST I : Retry n8n

Préparation : Simuler échec SMTP temporaire
Action : Déclencher transfert
Résultat attendu : Retry automatique, succès au 2ème essai
Données DB : Tentatives incrémentées, statut TERMINE final
TEST J : Même webhook envoyé deux fois

Préparation : Envoyer webhook avec même idempotency key
Action : Deuxième appel webhook
Résultat attendu : Un seul transfert, réponse 409 au deuxième appel
TEST K : Redémarrage n8n après réception

Préparation : Envoyer webhook
Action : Redémarrer n8n avant callback
Résultat attendu : Callback envoyé après redémarrage (si n8n reprend le workflow)
TEST L : Message déjà transféré

Préparation : Transférer un message
Action : Essayer de transférer le même message
Résultat attendu : Erreur 409 (cleIdempotence déjà utilisée)
TEST M : Message généré par MailFlow

Préparation : Déclencher une relance MailFlow
Action : Essayer de transférer la relance
Résultat attendu : Transfert refusé (X-MailFlow-Type détecté)
TEST N : Tentative de boucle A → B → A

Préparation : Configurer transfert A → B et B → A
Action : Envoyer email vers A
Résultat attendu : Un seul transfert, boucle détectée
16.2. Nouveaux tests
TEST O : SMTP réussi + callback perdu

Préparation : Envoyer webhook
Action : Couper n8n après SMTP réussi, avant callback
Résultat attendu : Travail reste EN_ATTENTE dans MailFlow
Récupération : Intervention manuelle (acceptée pour le PoC)
TEST P : Callback reçu deux fois

Préparation : Transfert réussi
Action : Envoyer le même callback deux fois
Résultat attendu : Premier callback traite, deuxième ignoré (statut TERMINE)
TEST Q : n8n redémarre après SMTP réussi

Préparation : Envoyer webhook
Action : Redémarrer n8n après SMTP réussi
Résultat attendu : n8n perd l'état, callback non envoyé
Récupération : Intervention manuelle (acceptée pour le PoC)
TEST R : Même message transféré simultanément deux fois

Préparation : Envoyer deux webhooks simultanés pour le même message
Action : Les deux arrivent en même temps
Résultat attendu : Un seul travail créé (contrainte cleIdempotence), un échec 409
TEST S : Réponse depuis B avec In-Reply-To du nouveau Message-ID

Préparation : Transférer email vers B
Action : Répondre depuis B (In-Reply-To = nouveau Message-ID)
Résultat attendu : Réponse détectée via X-MailFlow-Original-Message-ID, rattachée à l'échange original
TEST T : Réponse depuis B avec References uniquement

Préparation : Transférer email vers B
Action : Répondre depuis B (References = original + transfert)
Résultat attendu : Réponse détectée via References, rattachée à l'échange original
TEST U : Email HTML + image inline + pièce jointe

Préparation : Envoyer email HTML avec image inline + pièce jointe PDF vers boîte A
Action : Qualifier l'échange, déclencher transfert
Résultat attendu : HTML conservé, image inline conservée, pièce jointe conservée
Vérification : Rendering correct dans B
TEST V : Boucle A → B → A

Préparation : Configurer transfert A → B et B → A
Action : Envoyer email vers A
Résultat attendu : Un seul transfert, deuxième bloqué (échange déjà transféré)
17. CRITÈRES DE VALIDATION
POC PRÊT À CODER SOUS CONDITIONS
Conditions
Accepter la limitation de reconstruction MIME
Le node SMTP de n8n ne reconstruira pas EXACTEMENT le MIME original
Pour le PoC, une reconstruction fonctionnelle est acceptable
Pour la production, envisager une solution plus robuste (ex: forwarding IMAP natif)
Accepter la perte d'état n8n au redémarrage
n8n perd l'état en mémoire au redémarrage
Pour le PoC, accepter qu'un travail puisse rester EN_ATTENTE en cas de crash
Pour la production, ajouter un cache externe (Redis) ou une réconciliation périodique
Accepter l'absence de retry automatique MailFlow
Si le webhook n8n échoue, le travail reste EN_ATTENTE
Pour le PoC, intervention manuelle si nécessaire
Pour la production, ajouter un job de retry des travaux EN_ATTENTE depuis trop longtemps
Limitation à une seule destination par échange
Pour le PoC, un échange ne peut être transféré qu'une seule fois
Pour la production, permettre les transferts multiples (avec cleIdempotence améliorée)
Whitelist stricte des destinations
Pour le PoC, seules les destinations explicitement autorisées sont acceptées
Pour la production, mécanisme plus flexible (X-MailFlow-Transfer-Chain)
Justification
Le PoC est techniquement faisable avec l'architecture proposée, mais certaines limitations sont acceptées pour cette phase de validation :

Reconstruction MIME : Fonctionnelle pour le PoC, perfectible pour la production
Gestion de l'état : Acceptable pour le PoC, à améliorer pour la production
Anti-boucle : Suffisant pour le PoC (2 boîtes), à étendre pour la production
Ces conditions ne remettent pas en cause le principe fondamental : MailFlow reste le cerveau métier, n8n reste la couche d'automatisation.

18. VERDICT FINAL
POC PRÊT À CODER SOUS CONDITIONS
Le PoC est techniquement prêt à être implémenté avec les conditions listées ci-dessus. L'architecture respecte les contraintes absolues :

✅ Aucune modification du moteur métier existant
✅ Utilisation de TravailPlanifie existant
✅ Aucune nouvelle table inutile
✅ Modifications minimales et ciblées
✅ Séparation claire des responsabilités (MailFlow = métier, n8n = technique)
✅ Idempotence à plusieurs niveaux
✅ Sécurité par HMAC-SHA256
✅ Tests complets
Les conditions acceptées sont des limitations raisonnables pour une phase de PoC, qui pourront être adressées dans une phase de production si le concept est validé.














Drop to add to agent

