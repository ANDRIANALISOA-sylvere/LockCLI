#!/usr/bin/env node

/**
 * LockCLI - Password Manager CLI (v1.1)
 *
 * Commandes:
 *   lockcli          → Menu interactif
 *   lockcli update   → Met à jour vers la v1.1 (migration automatique)
 *   lockcli --version → Affiche la version
 *
 * Améliorations de sécurité:
 * - AES-256-GCM avec authentification intégrée
 * - Salt unique par utilisateur
 * - bcrypt rounds augmentés à 14
 * - Paramètres scrypt renforcés (N=16384, r=8, p=1)
 */

import {
  createMasterPassword,
  isMasterPasswordSet,
  verifyMasterPassword,
  getKeySalt,
} from "./auth.js";
import { checkMigrationNeeded, runMigration } from "./migration.js";
import figlet from "figlet";
import chalk from "chalk";
import { showMenu } from "./menu.js";

const PACKAGE_VERSION = "1.1.0";

function showBanner() {
  console.log(chalk.yellow(figlet.textSync("LockCLI", { font: "Big" })));
  console.log(chalk.gray(` v${PACKAGE_VERSION} - Your local password manager\n`));
}

/**
 * Affiche l'aide
 */
function showHelp() {
  console.log(chalk.cyan("\nLockCLI - Gestionnaire de mots de passe local\n"));
  console.log("Usage:");
  console.log("  lockcli          Menu interactif");
  console.log("  lockcli update   Met à jour vault vers v" + PACKAGE_VERSION);
  console.log("  lockcli --version Affiche la version");
  console.log("  lockcli --help    Affiche cette aide\n");
  console.log(chalk.gray("Les donnees sont stockees localement dans ~/.lockcli/\n"));
}

/**
 * Commande update explicite
 */
async function handleUpdateCommand() {
  const migration = await import("./migration.js").then((m) => m.checkMigrationNeeded());

  if (!migration.needsMigration) {
    console.log(chalk.green("\nLockCLI est deja a jour (v" + PACKAGE_VERSION + ")"));
    return;
  }

  console.log(chalk.yellow("\nMise a jour de LockCLI..."));
  const success = await runMigration();

  if (success) {
    console.log(chalk.green("\nMise a jour terminee ! Utilisez 'lockcli' pour continuer."));
  } else {
    console.log(chalk.red("\nLa mise a jour a echoue. Veuillez reessayer."));
    process.exit(1);
  }
}

/**
 * Point d'entrée principal
 */
async function main() {
  // Parser les arguments CLI
  const args = process.argv.slice(2);
  const command = args[0];

  // Commandes speciales
  if (command === "--version" || command === "-v") {
    console.log("LockCLI v" + PACKAGE_VERSION);
    return;
  }

  if (command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  if (command === "update") {
    await handleUpdateCommand();
    return;
  }

  // Menu interactif par défaut
  showBanner();

  if (!isMasterPasswordSet()) {
    const masterPassword = await createMasterPassword();
    const keySalt = getKeySalt();
    await showMenu(masterPassword, keySalt);
    return;
  }

  // Migration automatique si nécessaire (sauf si commande explicite)
  const migration = checkMigrationNeeded();
  if (migration.needsMigration) {
    console.log(
      chalk.yellow(
        `\nUne mise a jour est disponible (v${migration.fromVersion} -> v${migration.toVersion})`
      )
    );
    console.log(chalk.gray("Lancez 'lockcli update' pour mettre a jour votre vault.\n"));
    return;
  }

  const authData = await verifyMasterPassword();
  await showMenu(authData.password, authData.keySalt);
}

main().catch((error) => {
  console.error(chalk.red("Erreur fatale:"), error.message);
  process.exit(1);
});
