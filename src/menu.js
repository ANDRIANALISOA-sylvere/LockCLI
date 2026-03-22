/**
 * LockCLI - Menu interactif
 *
 * Améliorations de sécurité v1.1:
 * - Passe le keySalt aux fonctions de chiffrement/déchiffrement
 * - Affichage des erreurs de déchiffrement si données corrompues
 * - Copie des mots de passe dans le presse-papier
 */

import { select, input, password, confirm } from "@inquirer/prompts";
import {
  addPassword,
  deletePassword,
  getPasswords,
  updatePassword,
  exportVault,
  importVault,
} from "./vault.js";
import { CONSTANT } from "./constants.js";
import chalk from "chalk";
import Table from "cli-table3";
import boxen from "boxen";
import clipboardy from "clipboardy";

/**
 * Affiche le menu principal et gère les actions
 *
 * @param {string} masterPassword - Le master password vérifié
 * @param {Buffer|string} keySalt - Le salt pour la dérivation de clé
 */
async function showMenu(masterPassword, keySalt) {
  const action = await select({
    message: "Que voulez-vous faire ?",
    choices: [
      { name: "Ajouter un mot de passe", value: CONSTANT.ADD_PASSWOR },
      { name: "Voir mes mots de passe", value: CONSTANT.SEE_PASSWORD },
      { name: "Copier un mot de passe", value: CONSTANT.COPY_PASSWORD },
      { name: "Modifier un mot de passe", value: CONSTANT.UPDATED_PASSWORD },
      { name: "Supprimer un mot de passe", value: CONSTANT.DELETE_PASSWORD },
      { name: "Exporter le vault", value: CONSTANT.EXPORT_VAULT },
      { name: "Importer un vault", value: CONSTANT.IMPORT_VAULT },
      { name: "Quitter", value: "exit" },
    ],
  });

  switch (action) {
    case CONSTANT.ADD_PASSWOR:
      await handleAdd(masterPassword, keySalt);
      break;
    case CONSTANT.SEE_PASSWORD:
      handleShow(masterPassword);
      break;
    case CONSTANT.COPY_PASSWORD:
      await handleCopy(masterPassword);
      break;
    case CONSTANT.UPDATED_PASSWORD:
      await handleUpdate(masterPassword, keySalt);
      break;
    case CONSTANT.DELETE_PASSWORD:
      await handleDelete(masterPassword);
      break;
    case CONSTANT.EXPORT_VAULT:
      await handleExport();
      break;
    case CONSTANT.IMPORT_VAULT:
      await handleImport();
      break;
    case CONSTANT.EXIT:
      console.log(
        boxen(chalk.yellow("Au revoir !"), {
          padding: 1,
          borderColor: "yellow",
          borderStyle: "round",
        }),
      );
      process.exit(0);
  }

  await showMenu(masterPassword, keySalt);
}

/**
 * Gère l'ajout d'un nouveau mot de passe
 */
async function handleAdd(masterPassword, keySalt) {
  const service = await input({ message: "Nom du service (ex: Facebook) :" });
  const username = await input({ message: "Username ou email ou Num Tel:" });
  const pass = await password({ message: "Mot de passe :", mask: "*" });
  await addPassword(service, username, pass, masterPassword, keySalt);
}

/**
 * Affiche tous les mots de passe déchiffrés
 */
function handleShow(masterPassword) {
  const passwords = getPasswords(masterPassword);

  if (passwords.length === 0) {
    console.log(
      boxen(chalk.yellow("Aucun mot de passe enregistre"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
    return;
  }

  const table = new Table({
    head: [
      chalk.yellow("#"),
      chalk.yellow("Service"),
      chalk.yellow("Username"),
      chalk.yellow("Mot de passe"),
      chalk.yellow("Ajoute le"),
    ],
    colWidths: [5, 20, 30, 25, 12],
    style: { border: ["gray"] },
    wordWrap: true,
  });

  let hasErrors = false;

  passwords.forEach((item, index) => {
    // Masquer le mot de passe partiellement pour l'affichage
    const passwordDisplay = item._error
      ? chalk.bgRed.white(item.password)
      : chalk.gray(item.password.substring(0, 3) + "..." + item.password.substring(item.password.length - 2));

    table.push([
      chalk.white(index + 1),
      chalk.bold.cyan(item.service),
      chalk.white(item.username),
      passwordDisplay,
      chalk.dim(new Date(item.createdAt).toLocaleDateString("fr-FR")),
    ]);

    if (item._error) hasErrors = true;
  });

  console.log("\n" + chalk.bold.white("  Vos mots de passe\n"));
  console.log(table.toString());
  console.log(chalk.gray("Astuce: Utilisez 'Copier un mot de passe' pour copier dans le presse-papier\n"));

  if (hasErrors) {
    console.log(
      boxen(
        chalk.red(
          "ATTENTION: Certaines entrees n'ont pas pu etre dechiffrees.\n" +
            "Vos donnees peuvent etre corrompues."
        ),
        {
          padding: 1,
          borderColor: "red",
          borderStyle: "round",
        }
      )
    );
  }
}

/**
 * Copie un mot de passe dans le presse-papier
 */
async function handleCopy(masterPassword) {
  const passwords = getPasswords(masterPassword);

  if (passwords.length === 0) {
    console.log(
      boxen(chalk.yellow("Aucun mot de passe enregistre"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
    return;
  }

  // Filtrer les entrées avec erreur
  const validPasswords = passwords.filter((p) => !p._error);

  if (validPasswords.length === 0) {
    console.log(
      boxen(
        chalk.red(
          "Aucune entree valide disponible. Vos donnees peuvent etre corrompues."
        ),
        {
          padding: 1,
          borderColor: "red",
          borderStyle: "round",
        }
      )
    );
    return;
  }

  const service = await select({
    message: "Quel mot de passe copier ?",
    choices: validPasswords.map((item) => ({
      name: `${item.service} (${item.username})`,
      value: item.service,
    })),
  });

  const selected = validPasswords.find((p) => p.service === service);

  try {
    await clipboardy.write(selected.password);

    console.log(
      boxen(
        chalk.green(`Mot de passe pour "${service}" copie dans le presse-papier !\n\n`) +
          chalk.gray(`Password: ${selected.password}\n`) +
          chalk.gray(`Username: ${selected.username}\n`) +
          chalk.yellow("Collez avec Ctrl+V (ou Cmd+V sur Mac)"),
        {
          padding: 1,
          borderColor: "green",
          borderStyle: "round",
          title: "Copie reussie",
        }
      )
    );

    // Effacer le presse-papier après 30 secondes par sécurité
    console.log(chalk.gray("\n[INFO] Le presse-papier sera efface dans 30 secondes par securite..."));
    setTimeout(async () => {
      try {
        const currentContent = await clipboardy.read();
        if (currentContent === selected.password) {
          await clipboardy.write("");
          console.log(chalk.gray("[INFO] Presse-papier efface."));
        }
      } catch {
        // Silencieux en cas d'erreur
      }
    }, 30000);
  } catch (error) {
    console.log(
      boxen(chalk.red(`Erreur lors de la copie: ${error.message}`), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
  }
}

/**
 * Gère la modification d'un mot de passe
 */
async function handleUpdate(masterPassword, keySalt) {
  const passwords = getPasswords(masterPassword);

  if (passwords.length === 0) {
    console.log(
      boxen(chalk.yellow("Aucun mot de passe enregistre"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
    return;
  }

  // Filtrer les entrées avec erreur
  const validPasswords = passwords.filter((p) => !p._error);

  if (validPasswords.length === 0) {
    console.log(
      boxen(
        chalk.red(
          "Aucune entree valide disponible. Vos donnees peuvent etre corrompues."
        ),
        {
          padding: 1,
          borderColor: "red",
          borderStyle: "round",
        }
      )
    );
    return;
  }

  const service = await select({
    message: "Quel service modifier ?",
    choices: validPasswords.map((item) => ({
      name: item.service,
      value: item.service,
    })),
  });

  const newPass = await password({
    message: "Nouveau mot de passe :",
    mask: "*",
  });
  await updatePassword(service, newPass, masterPassword, keySalt);
}

/**
 * Gère la suppression d'un mot de passe
 */
async function handleDelete(masterPassword) {
  const passwords = getPasswords(masterPassword);

  if (passwords.length === 0) {
    console.log(
      boxen(chalk.yellow("Aucun mot de passe enregistre"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
    return;
  }

  const service = await select({
    message: "Quel service supprimer ?",
    choices: passwords.map((item) => ({
      name: item._error ? `${item.service} (erreur)` : item.service,
      value: item.service,
    })),
  });

  const ok = await confirm({
    message: `Confirmer la suppression de "${service}" ?`,
    default: false,
  });

  if (ok) {
    await deletePassword(service);
  } else {
    console.log(
      boxen(chalk.yellow("Suppression annulee"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
  }
}

/**
 * Gère l'export du vault
 */
async function handleExport() {
  const defaultPath = `lockcli-backup-${new Date().toISOString().slice(0, 10)}.json`;

  const exportPath = await input({
    message: "Chemin du fichier d'export :",
    default: defaultPath,
  });

  const ok = await confirm({
    message: `Exporter vers "${exportPath}" ? (les mots de passe restent chiffres)`,
    default: true,
  });

  if (ok) {
    exportVault(exportPath);
  } else {
    console.log(
      boxen(chalk.yellow("Export annule"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
  }
}

/**
 * Gère l'import d'un vault
 */
async function handleImport() {
  const importPath = await input({
    message: "Chemin du fichier a importer :",
  });

  const mode = await select({
    message: "Mode d'import :",
    choices: [
      { name: "Fusionner (garder les existants)", value: "merge" },
      { name: "Remplacer tout le vault", value: "replace" },
    ],
  });

  if (mode === "replace") {
    const ok = await confirm({
      message: chalk.red("ATTENTION: Cela ecrasera TOUS vos mots de passe actuels. Continuer ?"),
      default: false,
    });

    if (!ok) {
      console.log(
        boxen(chalk.yellow("Import annule"), {
          padding: 1,
          borderColor: "yellow",
          borderStyle: "round",
        }),
      );
      return;
    }
  }

  importVault(importPath, mode);
}

export { showMenu };
