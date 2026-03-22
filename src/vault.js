/**
 * LockCLI - Module de gestion du vault
 *
 * Améliorations de sécurité v2.0:
 * - Utilise le salt stocké dans master.json pour la dérivation de clé
 * - Gestion des erreurs de déchiffrement avec messages clairs
 * - Validation des données avant sauvegarde
 */

import fs from "fs";
import { LOCKCLI_DIR } from "./auth.js";
import boxen from "boxen";
import chalk from "chalk";
import { decrypt, encrypt, validateEncryptedFormat } from "./crypto.js";

export const VAULT_FILE = LOCKCLI_DIR + "/vault.json";

/**
 * Lit le vault depuis le disque
 *
 * @returns {Array} Le vault (tableau vide si n'existe pas)
 */
function readVault() {
  if (!fs.existsSync(VAULT_FILE)) {
    return [];
  }

  try {
    const content = fs.readFileSync(VAULT_FILE, "utf-8");
    const data = JSON.parse(content);

    // Validation basique de la structure
    if (!Array.isArray(data)) {
      console.log(
        boxen(chalk.red("❌ Format de vault invalide"), {
          padding: 1,
          borderColor: "red",
          borderStyle: "round",
        })
      );
      return [];
    }

    return data;
  } catch (error) {
    console.log(
      boxen(chalk.red("❌ Erreur de lecture du vault: " + error.message), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
    return [];
  }
}

/**
 * Sauvegarde le vault sur le disque avec permissions restrictives
 *
 * @param {Array} data - Les données du vault
 */
function saveVault(data) {
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(VAULT_FILE, content, { mode: 0o600 });
  } catch (error) {
    console.log(
      boxen(chalk.red("❌ Erreur de sauvegarde: " + error.message), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
    throw error;
  }
}

/**
 * Ajoute un nouveau mot de passe au vault
 *
 * @param {string} service - Le nom du service
 * @param {string} username - Le nom d'utilisateur
 * @param {string} password - Le mot de passe à stocker
 * @param {string} masterPassword - Le master password pour le chiffrement
 * @param {Buffer|string} keySalt - Le salt pour la dérivation de clé
 */
async function addPassword(service, username, password, masterPassword, keySalt) {
  if (!service || !username || !password) {
    console.log(
      boxen(chalk.yellow("Tous les champs sont obligatoires"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      })
    );
    return;
  }

  const vault = readVault();

  // Vérifier si le service existe déjà
  const existing = vault.find((item) => item.service === service);
  if (existing) {
    console.log(
      boxen(chalk.yellow(`⚠️  Le service "${service}" existe déjà`), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      })
    );
    return;
  }

  try {
    // Chiffrer avec le salt de master.json
    const encrypted = encrypt(password, masterPassword, keySalt);

    vault.push({
      service,
      username,
      password: encrypted, // Stocké au format salt:iv:authTag:encrypted
      createdAt: Date.now(),
    });

    saveVault(vault);

    console.log(
      boxen(chalk.green(`✅ Mot de passe pour "${service}" ajouté`), {
        padding: 1,
        borderColor: "green",
        borderStyle: "round",
      })
    );
  } catch (error) {
    console.log(
      boxen(chalk.red("❌ Erreur lors du chiffrement: " + error.message), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
  }
}

/**
 * Récupère tous les mots de passe déchiffrés
 *
 * @param {string} masterPassword - Le master password
 * @returns {Array} Liste des entrées déchiffrées
 */
function getPasswords(masterPassword) {
  const vault = readVault();
  const result = [];

  for (const item of vault) {
    try {
      // Validation du format avant déchiffrement
      if (!validateEncryptedFormat(item.password)) {
        result.push({
          ...item,
          password: "[FORMAT INVALIDE - Données corrompues]",
          _error: true,
        });
        continue;
      }

      const decrypted = decrypt(item.password, masterPassword);
      result.push({
        ...item,
        password: decrypted,
        _error: false,
      });
    } catch (error) {
      // Erreur de déchiffrement - mauvais master password ou données corrompues
      result.push({
        ...item,
        password: "[ERREUR DÉCHIFFREMENT]",
        _error: true,
      });
    }
  }

  return result;
}

/**
 * Supprime un mot de passe du vault
 *
 * @param {string} service - Le nom du service à supprimer
 */
async function deletePassword(service) {
  const vault = readVault();

  const exists = vault.find((item) => item.service === service);
  if (!exists) {
    console.log(
      boxen(chalk.yellow(`⚠️  Service "${service}" introuvable`), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      })
    );
    return;
  }

  const updated = vault.filter((item) => item.service !== service);
  saveVault(updated);

  console.log(
    boxen(chalk.green(`✅ Service "${service}" supprimé`), {
      padding: 1,
      borderColor: "green",
      borderStyle: "round",
    })
  );
}

/**
 * Met à jour un mot de passe existant
 *
 * @param {string} service - Le nom du service
 * @param {string} newPassword - Le nouveau mot de passe
 * @param {string} masterPassword - Le master password
 * @param {Buffer|string} keySalt - Le salt pour la dérivation de clé
 */
async function updatePassword(service, newPassword, masterPassword, keySalt) {
  const vault = readVault();

  const item = vault.find((item) => item.service === service);
  if (!item) {
    console.log(
      boxen(chalk.yellow(`⚠️  Service "${service}" introuvable`), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      })
    );
    return;
  }

  try {
    // Rechiffrer avec le même salt
    const encrypted = encrypt(newPassword, masterPassword, keySalt);

    item.password = encrypted;
    item.updatedAt = Date.now();

    saveVault(vault);

    console.log(
      boxen(chalk.green(`✅ Mot de passe pour "${service}" mis à jour`), {
        padding: 1,
        borderColor: "green",
        borderStyle: "round",
      })
    );
  } catch (error) {
    console.log(
      boxen(chalk.red("❌ Erreur lors du chiffrement: " + error.message), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
  }
}

/**
 * Compte le nombre d'entrées dans le vault
 *
 * @returns {number} Nombre d'entrées
 */
function getVaultCount() {
  return readVault().length;
}

/**
 * Valide l'intégrité du vault
 *
 * @returns {object} { valid: boolean, errors: Array }
 */
function validateVault() {
  const vault = readVault();
  const errors = [];

  for (let i = 0; i < vault.length; i++) {
    const item = vault[i];

    if (!item.service) {
      errors.push(`Entrée ${i + 1}:缺少 service`);
    }
    if (!item.username) {
      errors.push(`Entrée ${i + 1}:缺少 username`);
    }
    if (!item.password) {
      errors.push(`Entrée ${i + 1}:缺少 password`);
    } else if (!validateEncryptedFormat(item.password)) {
      errors.push(`Entrée ${i + 1}:Format de chiffrement invalide`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Exporte le vault chiffré vers un fichier JSON
 *
 * @param {string} exportPath - Chemin du fichier d'export
 * @returns {boolean} Succès de l'export
 */
function exportVault(exportPath) {
  const vault = readVault();

  if (vault.length === 0) {
    console.log(
      boxen(chalk.yellow("Aucun mot de passe a exporter"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      })
    );
    return false;
  }

  try {
    const exportData = {
      format: "lockcli-export",
      version: "1.1",
      exportedAt: new Date().toISOString(),
      count: vault.length,
      entries: vault,
    };

    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), { mode: 0o600 });

    console.log(
      boxen(
        chalk.green(`${vault.length} mot(s) de passe exporte(s)\n\n`) +
          chalk.gray(`Fichier: ${exportPath}`),
        {
          padding: 1,
          borderColor: "green",
          borderStyle: "round",
          title: "Export reussi",
        }
      )
    );
    return true;
  } catch (error) {
    console.log(
      boxen(chalk.red("Erreur d'export: " + error.message), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
    return false;
  }
}

/**
 * Importe un vault depuis un fichier JSON
 *
 * @param {string} importPath - Chemin du fichier d'import
 * @param {string} mode - "merge" (fusionner) ou "replace" (remplacer)
 * @returns {object} { success: boolean, imported: number, skipped: number }
 */
function importVault(importPath, mode = "merge") {
  if (!fs.existsSync(importPath)) {
    console.log(
      boxen(chalk.red(`Fichier introuvable: ${importPath}`), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
    return { success: false, imported: 0, skipped: 0 };
  }

  try {
    const content = fs.readFileSync(importPath, "utf-8");
    const importData = JSON.parse(content);

    // Valider le format
    if (importData.format !== "lockcli-export" || !Array.isArray(importData.entries)) {
      console.log(
        boxen(chalk.red("Format de fichier invalide. Utilisez un fichier exporte par LockCLI."), {
          padding: 1,
          borderColor: "red",
          borderStyle: "round",
        })
      );
      return { success: false, imported: 0, skipped: 0 };
    }

    const entries = importData.entries;

    if (mode === "replace") {
      saveVault(entries);
      console.log(
        boxen(
          chalk.green(`${entries.length} mot(s) de passe importe(s) (remplacement)`),
          {
            padding: 1,
            borderColor: "green",
            borderStyle: "round",
            title: "Import reussi",
          }
        )
      );
      return { success: true, imported: entries.length, skipped: 0 };
    }

    // Mode merge: fusionner sans écraser les existants
    const vault = readVault();
    let imported = 0;
    let skipped = 0;

    for (const entry of entries) {
      if (!entry.service || !entry.username || !entry.password) {
        skipped++;
        continue;
      }

      const exists = vault.find((item) => item.service === entry.service);
      if (exists) {
        skipped++;
        continue;
      }

      vault.push(entry);
      imported++;
    }

    saveVault(vault);

    console.log(
      boxen(
        chalk.green(`Import termine\n\n`) +
          chalk.white(`  Importes: ${imported}\n`) +
          chalk.gray(`  Ignores (doublons): ${skipped}`),
        {
          padding: 1,
          borderColor: "green",
          borderStyle: "round",
          title: "Import reussi",
        }
      )
    );

    return { success: true, imported, skipped };
  } catch (error) {
    console.log(
      boxen(chalk.red("Erreur d'import: " + error.message), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      })
    );
    return { success: false, imported: 0, skipped: 0 };
  }
}

export {
  addPassword,
  getPasswords,
  deletePassword,
  updatePassword,
  getVaultCount,
  validateVault,
  exportVault,
  importVault,
};
