/**
 * LockCLI - Migration automatique
 *
 * Ce module gère la migration automatique des vaults entre versions.
 * La migration se lance automatiquement au démarrage si nécessaire.
 */

import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { password } from "@inquirer/prompts";
import chalk from "chalk";
import boxen from "boxen";
import os from "os";

const LOCKCLI_DIR = os.homedir() + "/.lockcli";
const MASTER_FILE = LOCKCLI_DIR + "/master.json";
const VAULT_FILE = LOCKCLI_DIR + "/vault.json";

// Ancienne implémentation v1.0 (pour lecture)
const OLD_ALGORITHM = "aes-256-cbc";
const OLD_SALT = "lockcli-salt";

function oldGetKey(masterPassword) {
  return crypto.scryptSync(masterPassword, OLD_SALT, 32);
}

function oldDecrypt(encryptedText, masterPassword) {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  const key = oldGetKey(masterPassword);
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(OLD_ALGORITHM, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}

// Nouvelle implémentation v1.1
const NEW_ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 32;
const IV_LENGTH = 16;

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 128 * 1024 * 1024,
};

function newDeriveKey(masterPassword, salt) {
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, "hex");
  return crypto.scryptSync(masterPassword, saltBuffer, 32, SCRYPT_PARAMS);
}

function newEncrypt(text, masterPassword, salt) {
  const key = newDeriveKey(masterPassword, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(NEW_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Vérifie si une migration est nécessaire
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

    if (currentVersion !== "1.1") {
      return {
        needsMigration: true,
        fromVersion: currentVersion,
        toVersion: "1.1",
      };
    }

    return { needsMigration: false };
  } catch {
    return { needsMigration: false };
  }
}

/**
 * Exécute la migration automatique
 *
 * @returns {Promise<boolean>} True si succès, false sinon
 */
async function runMigration() {
  const migration = checkMigrationNeeded();

  if (!migration.needsMigration) {
    return true;
  }

  console.log(
    boxen(
      chalk.yellow(
        `MISE A JOUR LockCLI v${migration.fromVersion} -> v${migration.toVersion}\n\n` +
        "Ameliorations de securite:\n" +
        "- Salt unique par utilisateur (plus de salt statique)\n" +
        "- Chiffrement AES-256-GCM (integrite des donnees)\n" +
        "- bcrypt 14 rounds (au lieu de 10)"
      ),
      {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
        title: "Mise a jour disponible",
      }
    )
  );

  // Demander le master password pour la migration
  const masterPassword = await password({
    message: "Entrez votre mot de passe master actuel pour continuer :",
    mask: "*",
  });

  // Vérifier le master password
  const masterData = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));
  const isValid = await bcrypt.compare(masterPassword, masterData.master);

  if (!isValid) {
    console.log(chalk.red("\nERREUR: Mot de passe incorrect. Migration annulee."));
    return false;
  }

  // Créer une sauvegarde automatique
  const timestamp = Date.now();
  const backupDir = LOCKCLI_DIR + "/backups";
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { mode: 0o700 });
  }

  const backupPath = `${backupDir}/migration-backup-${timestamp}.json`;

  console.log(chalk.gray("\nCreation de la sauvegarde automatique..."));
  fs.copyFileSync(VAULT_FILE, backupPath);
  fs.copyFileSync(MASTER_FILE, `${backupDir}/master-${timestamp}.json`);
  console.log(chalk.green(`Sauvegarde cree: ${backupPath}`));

  try {
    // Lire le vault
    const vault = JSON.parse(fs.readFileSync(VAULT_FILE, "utf-8"));
    console.log(chalk.gray(`Migration de ${vault.length} entrees...`));

    // Générer un nouveau salt
    const newSalt = crypto.randomBytes(SALT_LENGTH);

    // Migrer chaque entrée
    let successCount = 0;
    let errorCount = 0;

    for (const entry of vault) {
      try {
        // Déchiffrer avec l'ancienne méthode
        const decrypted = oldDecrypt(entry.password, masterPassword);

        // Rechiffrer avec la nouvelle méthode
        entry.password = newEncrypt(decrypted, masterPassword, newSalt);
        successCount++;
      } catch (error) {
        console.log(chalk.yellow(`  WARNING: ${entry.service}: ${error.message}`));
        errorCount++;
      }
    }

    // Sauvegarder le nouveau vault
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), { mode: 0o600 });

    // Mettre à jour master.json
    const newHash = await bcrypt.hash(masterPassword, 14);

    const newMasterData = {
      version: "1.1",
      master: newHash,
      keySalt: newSalt.toString("hex"),
      createdAt: masterData.createdAt || Date.now(),
      migratedFrom: migration.fromVersion,
      migratedAt: Date.now(),
    };

    fs.writeFileSync(MASTER_FILE, JSON.stringify(newMasterData, null, 2), {
      mode: 0o600,
    });

    console.log(
      boxen(
        chalk.green(
          `Migration terminee avec succes !\n\n` +
            `- Entrees migrees: ${successCount}\n` +
            (errorCount > 0 ? `- Erreurs: ${errorCount}\n` : "") +
            `- Sauvegarde: ${backupPath}`
        ),
        {
          padding: 1,
          borderColor: "green",
          borderStyle: "round",
        }
      )
    );

    console.log(chalk.gray("\nVous pouvez desormais supprimer la sauvegarde apres verification:"));
    console.log(chalk.gray(`rm "${backupPath}"\n`));

    return true;
  } catch (error) {
    // Restaurer la sauvegarde en cas d'erreur
    console.log(chalk.red(`\nERREUR: ${error.message}`));
    console.log(chalk.yellow("Restauration de la sauvegarde..."));

    fs.copyFileSync(backupPath, VAULT_FILE);
    fs.copyFileSync(`${backupDir}/master-${timestamp}.json`, MASTER_FILE);

    console.log(chalk.green("Sauvegarde restauree. Migration annulee."));
    return false;
  }
}

export { checkMigrationNeeded, runMigration };
