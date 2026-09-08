/**
 * MailFlow · Lanceur de l'ordonnanceur
 *
 *   npm run moteur              un seul passage, puis sortie
 *   npm run moteur:boucle       passage toutes les 5 minutes
 *   npm run moteur:sante        surveillance seule, sans rien exécuter
 *
 * Le passage unique est fait pour être appelé par une tâche planifiée
 * (cron, planificateur Windows, conteneur). La boucle sert au développement
 * et aux petites installations sans ordonnanceur système.
 *
 * Code de sortie : 0 si tout va bien, 1 si la surveillance relève une
 * anomalie critique. C'est ce que lira la supervision du client.
 */

import "dotenv/config";

import { executerCycle, type RapportCycle } from "../src/moteur/ordonnanceur";
import { type Sante, verifierSante } from "../src/moteur/sante";
import { prisma } from "../src/lib/prisma";

const args = process.argv.slice(2);
const aOption = (n: string) => args.includes(`--${n}`);
const valeur = (n: string, defaut: number) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  const v = a ? Number(a.split("=")[1]) : NaN;
  return Number.isFinite(v) && v > 0 ? v : defaut;
};

const horloge = (d: Date) => d.toISOString().slice(11, 19);

function afficherRapport(r: RapportCycle) {
  const duree = r.fin.getTime() - r.debut.getTime();
  const resume = [
    `pris ${r.pris}`,
    `exécutés ${r.executes}`,
    `reportés ${r.reportes}`,
    `refusés ${r.refuses}`,
    `périmés ${r.perimes}`,
    `échecs ${r.echecs}`,
  ].join(" · ");

  console.log(`[${horloge(r.fin)}] cycle ${duree} ms · ${resume}`);
  if (r.verrousLiberes > 0) {
    console.log(`            ${r.verrousLiberes} verrou(x) périmé(s) libéré(s)`);
  }
  for (const l of r.lignes) console.log(`            ${l}`);
  if (r.alerte) console.log(`            ${r.alerte}`);
}

/**
 * Affiche l'état de santé. Réutilise celui que le cycle vient de relever
 * plutôt que d'interroger la base une seconde fois pour le même verdict.
 */
async function afficherSante(deja?: Sante): Promise<boolean> {
  const s = deja ?? (await verifierSante());

  if (s.anomalies.length === 0) {
    console.log(`[${horloge(s.verifieLe)}] surveillance : rien à signaler.`);
    return true;
  }

  const rang: Record<string, number> = { critique: 0, attention: 1, info: 2 };
  const triees = [...s.anomalies].sort(
    (a, b) => rang[a.gravite] - rang[b.gravite]
  );

  console.log(`[${horloge(s.verifieLe)}] surveillance : ${s.anomalies.length} anomalie(s)`);
  for (const a of triees) {
    const marque =
      a.gravite === "critique" ? "!!" : a.gravite === "attention" ? " !" : "  ";
    console.log(`  ${marque} [${a.code}] ${a.message}`);
  }

  return !triees.some((a) => a.gravite === "critique");
}

async function main() {
  if (aOption("sante")) {
    const ok = await afficherSante();
    process.exitCode = ok ? 0 : 1;
    return;
  }

  if (aOption("boucle")) {
    const intervalle = valeur("intervalle", 300);
    console.log(
      `Ordonnanceur en boucle, un passage toutes les ${intervalle} s. Ctrl+C pour arrêter.`
    );

    let arret = false;
    const stopper = () => {
      if (arret) return;
      arret = true;
      console.log("\nArrêt demandé, fin du passage en cours…");
    };
    process.on("SIGINT", stopper);
    process.on("SIGTERM", stopper);

    while (!arret) {
      try {
        afficherRapport(await executerCycle());
      } catch (e) {
        console.error(`[${horloge(new Date())}] cycle en erreur :`, e);
      }
      if (arret) break;
      await new Promise((r) => setTimeout(r, intervalle * 1000));
    }
    return;
  }

  // Passage unique
  const rapport = await executerCycle({ limite: valeur("limite", 20) });
  afficherRapport(rapport);
  const ok = await afficherSante(rapport.sante);
  process.exitCode = ok ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
