/**
 * MailFlow · Transformation d'un message en message transféré
 *
 * Ce fichier a deux vies :
 *   · il est importé tel quel par les tests (node --test) ;
 *   · son corps est INLINÉ dans le Code node n8n par deployer-transfert-n8n.ts.
 *
 * D'où les contraintes d'écriture : pas d'import, pas de dépendance, pas de
 * syntaxe que le bac à sable de n8n refuse. C'est le prix pour que le test
 * exerce le code réellement déployé, et non une copie qui dériverait.
 *
 * ── LE PRINCIPE ───────────────────────────────────────────────────────────
 *
 * On ne RECONSTRUIT pas le MIME, on remplace uniquement le bloc d'en-têtes.
 * Le corps repart octet pour octet : pièces jointes, multipart/related,
 * images en CID, noms de fichiers Unicode, encodages exotiques traversent
 * sans jamais être ré-encodés. C'est la seule façon de garantir la fidélité
 * sans bibliothèque de composition MIME — laquelle n'est de toute façon pas
 * disponible dans le Code node de cette instance.
 */

function transformerMime(brut, ctl) {
  // 'binary' (latin1) : un octet du Buffer = un caractère. Indispensable pour
  // que les décalages calculés sur la chaîne restent valides sur le Buffer.
  const texte = brut.toString("binary");
  const coupe = texte.search(/\r?\n\r?\n/);
  if (coupe < 0) throw new Error("DEFINITIF: MIME sans separation en-tetes/corps");
  const finSep = texte.slice(coupe).startsWith("\r\n\r\n") ? coupe + 4 : coupe + 2;
  const blocEntetes = texte.slice(0, coupe);
  const corps = brut.subarray(Buffer.byteLength(texte.slice(0, finSep), "binary"));

  // Un en-tête peut se replier sur plusieurs lignes (RFC 5322 §2.2.3) :
  // toute ligne commençant par une espace ou une tabulation prolonge la
  // précédente. Les regrouper avant de trier, sinon on décapite un References
  // long en laissant ses continuations orphelines dans le message.
  const lignes = blocEntetes.split(/\r?\n/);
  const entetes = [];
  for (const ligne of lignes) {
    if (/^[ \t]/.test(ligne) && entetes.length) entetes[entetes.length - 1] += "\r\n" + ligne;
    else if (ligne.length) entetes.push(ligne);
  }

  const nomDe = (e) => (e.split(":")[0] || "").trim().toLowerCase();
  const valeurDe = (e) => e.slice(e.indexOf(":") + 1).trim();
  const premier = (n) => {
    const e = entetes.find((x) => nomDe(x) === n);
    return e ? valeurDe(e) : "";
  };

  const messageIdOrigine = (premier("message-id").match(/<[^<>]+>/) || [""])[0];
  const referencesOrigine = premier("references").match(/<[^<>\s]+>/g) || [];
  const chaineRecue = premier("x-mailflow-transfer-chain");
  const sujetOrigine = premier("subject");

  // Ce qui ne survit pas à une modification du message. Garder une
  // DKIM-Signature devenue fausse est pire que ne pas en avoir : les
  // destinataires la vérifient, elle échoue, le message part en indésirable.
  const aJeter = [
    "dkim-signature", "arc-seal", "arc-message-signature", "arc-authentication-results",
    "authentication-results", "received", "return-path", "delivered-to", "x-original-to",
    "envelope-to", "message-id", "to", "cc", "bcc", "from", "reply-to", "content-length",
    // On recalcule le fil plus bas. Sans les retirer ici, le message partirait
    // avec DEUX References et DEUX In-Reply-To : les clients lisent le premier,
    // et le premier serait celui d'origine, qui ne cite pas le message transféré.
    "references", "in-reply-to",
    "x-mailflow-type", "x-mailflow-original-message-id", "x-mailflow-exchange-id",
    "x-mailflow-transfer-timestamp", "x-mailflow-transfer-chain",
  ];
  const gardes = entetes.filter((e) => aJeter.indexOf(nomDe(e)) === -1);

  // Le message transféré est un message distinct : il lui faut son identifiant.
  const domaine = String(ctl.source).split("@")[1] || "mailflow.local";
  const suffixe = Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  const nouvelId = "<mailflow-transfer-" + suffixe + "@" + domaine + ">";

  // ── LE FIL ──────────────────────────────────────────────────────────────
  // MailFlow rattache un entrant par calculerCleDeFil() = references[0].
  // References DOIT donc commencer par la racine du fil d'origine : c'est ce
  // qui fera retomber la réponse de B sur le MÊME Echange. On conserve l'ordre
  // chronologique et on ajoute le message d'origine en queue, comme une
  // réponse ordinaire.
  const references = referencesOrigine.slice();
  if (messageIdOrigine && references.indexOf(messageIdOrigine) === -1) references.push(messageIdOrigine);

  // A → B, puis A → B → C : la chaîne s'accumule au lieu de s'écraser.
  const chaine = (chaineRecue ? chaineRecue + ", " : "") + ctl.source + " -> " + ctl.destination;

  const ajouts = [
    "Message-ID: " + nouvelId,
    "From: " + ctl.source,
    "To: " + ctl.destination,
    "X-MailFlow-Type: transfer",
    "X-MailFlow-Original-Message-ID: " + (messageIdOrigine || "(absent)"),
    "X-MailFlow-Exchange-Id: " + ctl.exchangeId,
    "X-MailFlow-Transfer-Timestamp: " + new Date().toISOString(),
    "X-MailFlow-Transfer-Chain: " + chaine,
    // PAS de « Auto-Submitted: auto-forwarded » ici, bien que la RFC 3834 le
    // prevoie pour un acheminement automatique.
    //
    // Constate le 10/09/2026 : avec cet en-tete, Gmail classe le transfert en
    // indesirables alors meme que SPF, DKIM et DMARC passent tous les trois.
    // Or tout l'interet du transfert est que B LISE le message et y reponde :
    // un transfert dans les spams est un transfert perdu.
    //
    // Le risque que cet en-tete ecartait — un repondeur d'absence chez B qui
    // repondrait au transfert — reste couvert en aval : estAutomatique()
    // (src/connecteur/normalisation.ts) ecarte les reponses automatiques a la
    // captation, sur Auto-Submitted, Precedence et consorts.
  ];
  if (references.length) ajouts.push("References: " + references.join(" "));
  if (messageIdOrigine) ajouts.push("In-Reply-To: " + messageIdOrigine);

  const mime = Buffer.concat([
    Buffer.from(gardes.concat(ajouts).join("\r\n") + "\r\n\r\n", "binary"),
    corps,
  ]);

  return {
    mime: mime,
    meta: {
      nouvelId: nouvelId,
      messageIdOrigine: messageIdOrigine,
      references: references,
      chaine: chaine,
      sujet: sujetOrigine,
      octetsOrigine: brut.length,
      octetsSortie: mime.length,
      octetsCorps: corps.length,
      entetesRetires: entetes.length - gardes.length,
    },
  };
}

export { transformerMime };
