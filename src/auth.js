/**
 * LockCLI - Module d'authentification
 *
 * Améliorations de sécurité v1.1:
 * - bcrypt rounds augmenté de 10 → 14
 * - Salt de dérivation de clé généré aléatoirement
 * - Système de version pour migration des données
 * - Validation de la robustesse du master password
 */

import fs from "fs";
import bcrypt from "bcrypt";
import os from "os";
import { password } from "@inquirer/prompts";
import boxen from "boxen";
import chalk from "chalk";
import { generateSalt, checkPasswordStrength } from "./crypto.js";

export const LOCKCLI_DIR = os.homedir() + "/.lockcli";
const MASTER_FILE = LOCKCLI_DIR + "/master.json";

/**
 * Version actuelle du format de données
 * Permet de gérer les migrations futures
 */
const DATA_VERSION = "1.1";

/**
 * Vérifie si le master password est déjà configuré
 */
function isMasterPasswordSet() {
  return fs.existsSync(MASTER_FILE);
}

/**
 * Crée un nouveau master password avec les paramètres sécurisés
 *
 * @returns {Promise<string>} Le master password en clair (pour la session)
 */
async function createMasterPassword() {
  // Premier prompt - Création du mot de passe
  const pass = await password({
    message: "Créez votre mot de passe LOCKCLI :",
    mask: "*",
  });

  // Validation de la robustesse
  const strength = checkPasswordStrength(pass);

  if (!strength.isStrong) {
    console.log(
      boxen(
        chalk.yellow(
          "ATTENTION: Mot de passe faible !\n\n" +
            "Recommandations:\n" +
            strength.recommendations.map((r) => `- ${r}`).join("\n")
        ),
        {
          padding: 1,
          borderColor: "yellow",
          borderStyle: "round",
          title: "Avertissement",
        }
      )
    );

    const confirmWeak = await password({
      message: "Voulez-vous quand même utiliser ce mot de passe ? (tapez 'OUI' pour confirmer) :",
      mask: "*",
    });

    if (confirmWeak !== "OUI") {
      console.log(chalk.gray("\nCréation annulée. Relancez LockCLI."));
      process.exit(0);
    }
  }

  // Confirmation du mot de passe
  const confirm = await password({
    message: "Confirmez votre mot de passe LOCKCLI :",
    mask: "*",
  });

  if (pass !== confirm) {
    console.log(
      boxen(chalk.red("ERREUR: Les mots de passe ne correspondent pas"), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
    process.exit(1);
  }

  // Créer le répertoire si nécessaire
  if (!fs.existsSync(LOCKCLI_DIR)) {
    fs.mkdirSync(LOCKCLI_DIR, { mode: 0o700 });
  }

  // Hash bcrypt avec 14 rounds (au lieu de 10)
  const hash = await bcrypt.hash(pass, 14);

  // Générer le salt pour la dérivation de clé de chiffrement
  const keySalt = generateSalt();

  // Structure du fichier master
  const data = {
    version: DATA_VERSION,
    master: hash,
    keySalt: keySalt.toString("hex"), // Stocké en hex pour JSON
    createdAt: Date.now(),
    // Pour future migration: détecter l'ancien format
    migratedFrom: null,
  };

  fs.writeFileSync(MASTER_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });

  console.log(
    boxen(
      chalk.green("Mot de passe LockCLI cree avec succes\n\n") +
        chalk.gray(`Version du format: ${DATA_VERSION}\n`) +
        chalk.gray("Chiffrement: AES-256-GCM\n") +
        chalk.gray("Key derivation: scrypt (N=16384, r=8, p=1)"),
      {
        padding: 1,
        borderColor: "green",
        borderStyle: "round",
        title: "Succès",
      }
    )
  );

  return pass;
}

/**
 * Vérifie le master password et retourne les données master
 *
 * @returns {Promise<object>} { password: string, keySalt: Buffer, version: string }
 */
async function verifyMasterPassword() {
  const pass = await password({
    message: "Entrez votre mot de passe LOCKCLI :",
    mask: "*",
  });

  const data = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));
  const isValid = await bcrypt.compare(pass, data.master);

  if (!isValid) {
    console.log(
      boxen(chalk.red("ERREUR: Mot de passe incorrect"), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
    process.exit(1);
  }

  console.log(
    boxen(chalk.green("Bienvenue sur LockCLI"), {
      padding: 1,
      borderColor: "green",
      borderStyle: "round",
    })
  );

  return {
    password: pass,
    keySalt: data.keySalt ? Buffer.from(data.keySalt, "hex") : null,
    version: data.version || "1.0",
  };
}

/**
 * Récupère le salt de dérivation de clé depuis master.json
 *
 * @returns {Buffer|null} Le salt ou null si format ancien
 */
function getKeySalt() {
  if (!fs.existsSync(MASTER_FILE)) {
    return null;
  }

  try {
    const data = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));
    return data.keySalt ? Buffer.from(data.keySalt, "hex") : null;
  } catch {
    return null;
  }
}

/**
 * Détecte si une migration est nécessaire
 *
 * @returns {object} { needsMigration: boolean, fromVersion: string, toVersion: string }
 */
function checkMigrationNeeded() {
  if (!fs.existsSync(MASTER_FILE)) {
    return { needsMigration: false };
  }

  try {
    const data = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));
    const currentVersion = data.version || "1.0";

    if (currentVersion !== DATA_VERSION) {
      return {
        needsMigration: true,
        fromVersion: currentVersion,
        toVersion: DATA_VERSION,
      };
    }

    return { needsMigration: false };
  } catch {
    return { needsMigration: false };
  }
}

export {
  isMasterPasswordSet,
  createMasterPassword,
  verifyMasterPassword,
  getKeySalt,
  checkMigrationNeeded,
  DATA_VERSION,
};
