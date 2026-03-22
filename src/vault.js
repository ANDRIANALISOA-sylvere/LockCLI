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

export {
  addPassword,
  getPasswords,
  deletePassword,
  updatePassword,
  getVaultCount,
  validateVault,
};
