/**
 * MailFlow · API Callback Transfert n8n
 *
 * Endpoint de callback pour le webhook n8n de transfert.
 * Reçoit le résultat final du transfert et met à jour le TravailPlanifie.
 *
 * Authentification : HMAC-SHA256 avec timestamp
 * Idempotence : callback idempotent
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { createHmac, timingSafeEqual } from "node:crypto";

interface CallbackPayload {
  travailId: string;
  requestId: string;
  exchangeId: string;
  status: "success" | "failure";
  error?: string;
  messageSent?: boolean;
  messageId?: string;
  completedAt: string;
}

const SECRET = process.env.N8N_WEBHOOK_SECRET;
const REPLAY_WINDOW_MS = 5 * 60_000; // 5 minutes

/**
 * Vérifie la signature HMAC d'un callback.
 */
function verifierSignature(
  signature: string | null,
  timestamp: string | null,
  body: string
): boolean {
  if (!SECRET) {
    console.error("N8N_WEBHOOK_SECRET non configuré");
    return false;
  }

  if (!signature || !timestamp) {
    console.error("Signature ou timestamp manquant");
    return false;
  }

  const ts = parseInt(timestamp, 10);
  const now = Date.now();

  // Vérifier que le timestamp n'est ni trop vieux ni dans le futur
  if (Math.abs(now - ts) > REPLAY_WINDOW_MS) {
    console.error(`Timestamp invalide : ${ts} vs ${now} (écart ${Math.abs(now - ts)}ms)`);
    return false;
  }

  // Recalculer la signature
  const expected = createHmac("sha256", SECRET)
    .update(ts + "." + body)
    .digest("hex");

  // Comparaison sécurisée
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  try {
    return timingSafeEqual(expectedBuffer, receivedBuffer);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("X-MailFlow-Signature");
    const timestamp = req.headers.get("X-MailFlow-Timestamp");

    // Vérifier la signature
    if (!verifierSignature(signature, timestamp, body)) {
      return NextResponse.json(
        { error: "Signature invalide" },
        { status: 401 }
      );
    }

    let payload: CallbackPayload;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json(
        { error: "JSON invalide" },
        { status: 400 }
      );
    }

    // Valider le payload
    if (!payload.travailId || !payload.requestId || !payload.exchangeId || !payload.status) {
      return NextResponse.json(
        { error: "Payload incomplet" },
        { status: 400 }
      );
    }

    if (!["success", "failure"].includes(payload.status)) {
      return NextResponse.json(
        { error: "Status invalide" },
        { status: 400 }
      );
    }

    // Trouver le travail
    const travail = await prisma.travailPlanifie.findFirst({
      where: {
        id: payload.travailId,
        type: "TRANSFERT",
      },
    });

    if (!travail) {
      console.error(`Travail inconnu : ${payload.travailId}`);
      return NextResponse.json(
        { error: "Travail inconnu" },
        { status: 404 }
      );
    }

    // Vérifier que l'échange correspond
    if (travail.echangeId !== payload.exchangeId) {
      console.error(`Échange mismatch : ${travail.echangeId} vs ${payload.exchangeId}`);
      return NextResponse.json(
        { error: "Échange mismatch" },
        { status: 400 }
      );
    }

    // Extraire charge pour validation
    const charge = travail.charge && typeof travail.charge === "object" ? travail.charge as any : null;

    // Vérifier que requestId correspond à la demande attendue
    const expectedRequestId = `${travail.id}-transfer-${charge?.messageId}`;
    if (payload.requestId !== expectedRequestId) {
      console.error(`RequestId mismatch : ${payload.requestId} vs ${expectedRequestId}`);
      return NextResponse.json(
        { error: "RequestId mismatch" },
        { status: 400 }
      );
    }

    // Idempotence : si déjà terminé/annulé, on ignore silencieusement
    if (travail.statut === "TERMINE" || travail.statut === "ECHEC" || travail.statut === "ANNULE") {
      console.log(`Callback pour travail déjà finalisé : ${travail.id} (${travail.statut})`);
      return NextResponse.json({ success: true, dejaTraite: true });
    }

    // Mettre à jour le travail
    const updateData: any = {
      statut: payload.status === "success" ? "TERMINE" : "ECHEC",
      termineLe: new Date(payload.completedAt),
      verrouPar: null,
      verrouA: null,
    };

    if (payload.status === "failure" && payload.error) {
      updateData.derniereErreur = payload.error;
    }

    await prisma.travailPlanifie.update({
      where: { id: travail.id },
      data: updateData,
    });

    // Enregistrer un événement pour traçabilité
    const eventType = payload.status === "success" ? "MAIL_TRANSMIS" : "ANOMALIE_TECHNIQUE";
    const destination = charge?.destinationMailbox ?? "inconnue";
    
    await prisma.evenement.create({
      data: {
        echangeId: travail.echangeId,
        type: eventType,
        libelle: `Transfert ${payload.status === "success" ? "réussi" : "échoué"} vers ${destination}`,
        valeurApres: payload.status === "success" 
          ? { destination, messageId: payload.messageId }
          : { destination, error: payload.error },
      },
    });

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error("Erreur callback transfert :", e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
