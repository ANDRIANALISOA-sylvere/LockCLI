/**
 * LockCLI - Module de chiffrement sécurisé
 *
 * Améliorations de sécurité v1.1:
 * - AES-256-GCM (authentification intégrée)
 * - Salt unique par utilisateur (généré aléatoirement)
 * - Paramètres scrypt renforcés (N=16384, r=8, p=1)
 * - Format de sortie: salt:iv:authTag:encrypted
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const AUTH_TAG_LENGTH = 16;

/**
 * Paramètres scrypt conformes aux recommandations OWASP 2024
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
 */
const SCRYPT_PARAMS = {
  N: 16384,  // CPU/memory cost parameter (must be power of 2)
  r: 8,      // Block size parameter
  p: 1,      // Parallelization parameter
  maxmem: 128 * 1024 * 1024, // 128MB max memory
};

/**
 * Dérive une clé de chiffrement à partir du master password et du salt
 *
 * @param {string} masterPassword - Le master password de l'utilisateur
 * @param {Buffer|string} salt - Le salt unique de l'utilisateur (Buffer ou hex string)
 * @returns {Buffer} La clé dérivée de 32 bytes
 */
function deriveKey(masterPassword, salt) {
  const saltBuffer = Buffer.isBuffer(salt) ? salt : Buffer.from(salt, "hex");

  return crypto.scryptSync(
    masterPassword,
    saltBuffer,
    KEY_LENGTH,
    SCRYPT_PARAMS
  );
}

/**
 * Vérifie l'intégrité du format des données chiffrées
 *
 * @param {string} data - Données chiffrées au format salt:iv:authTag:encrypted
 * @returns {boolean} True si le format est valide
 */
function validateEncryptedFormat(data) {
  const parts = data.split(":");
  return parts.length === 4 &&
    parts[0].length === SALT_LENGTH * 2 &&  // salt en hex
    parts[1].length === IV_LENGTH * 2 &&    // iv en hex
    parts[2].length === AUTH_TAG_LENGTH * 2 && // authTag en hex
    parts[3].length > 0;                     // encrypted data
}

/**
 * Chiffre un texte avec AES-256-GCM
 *
 * Format de sortie: salt:iv:authTag:encrypted (tous en hexadécimal)
 *
 * @param {string} text - Le texte en clair à chiffrer
 * @param {string} masterPassword - Le master password
 * @param {Buffer|string|null} existingSalt - Salt existant (null pour en générer un nouveau)
 * @returns {string} Les données chiffrées au format salt:iv:authTag:encrypted
 */
export function encrypt(text, masterPassword, existingSalt = null) {
  if (!text || typeof text !== "string") {
    throw new Error("Text to encrypt must be a non-empty string");
  }
  if (!masterPassword || typeof masterPassword !== "string") {
    throw new Error("Master password must be a non-empty string");
  }

  // Générer ou réutiliser le salt
  const salt = existingSalt
    ? (Buffer.isBuffer(existingSalt) ? existingSalt : Buffer.from(existingSalt, "hex"))
    : crypto.randomBytes(SALT_LENGTH);

  // Dériver la clé
  const key = deriveKey(masterPassword, salt);

  // Générer un IV unique (NE JAMAIS réutiliser un IV avec la même clé)
  const iv = crypto.randomBytes(IV_LENGTH);

  // Chiffrement avec AES-256-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // GCM fournit l'authentification intégrée (authTag)
  const encrypted = Buffer.concat([
    cipher.update(text, "utf-8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:encrypted (tout en hex)
  return [
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Déchiffre des données chiffrées avec AES-256-GCM
 *
 * @param {string} encryptedData - Données chiffrées au format salt:iv:authTag:encrypted
 * @param {string} masterPassword - Le master password
 * @returns {string} Le texte en clair
 * @throws {Error} Si le format est invalide ou si l'authentification échoue
 */
export function decrypt(encryptedData, masterPassword) {
  if (!encryptedData || typeof encryptedData !== "string") {
    throw new Error("Encrypted data must be a non-empty string");
  }
  if (!masterPassword || typeof masterPassword !== "string") {
    throw new Error("Master password must be a non-empty string");
  }

  // Valider le format avant de traiter
  if (!validateEncryptedFormat(encryptedData)) {
    throw new Error("Invalid encrypted data format or corrupted data");
  }

  const [saltHex, ivHex, authTagHex, encryptedHex] = encryptedData.split(":");

  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  // Dériver la clé avec le salt stocké
  const key = deriveKey(masterPassword, salt);

  // Déchiffrement avec vérification d'authenticité
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  // Définir l'authTag pour vérification (GCM only)
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf-8");
  } catch (error) {
    // Erreur d'authentification = données corrompues ou mauvais mot de passe
    throw new Error(
      "Decryption failed: Data may be corrupted or invalid master password"
    );
  }
}

/**
 * Génère un nouveau salt pour un utilisateur
 *
 * @returns {Buffer} Un salt aléatoire de 32 bytes
 */
export function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH);
}

/**
 * Vérifie la robustesse d'un mot de passe
 *
 * @param {string} password - Le mot de passe à vérifier
 * @returns {object} Résultat avec score et recommandations
 */
export function checkPasswordStrength(password) {
  const checks = {
    length: password.length >= 12,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  return {
    score, // 0-5
    isStrong: score >= 4,
    checks,
    recommendations: [
      !checks.length && "Au moins 12 caractères",
      !checks.hasLower && "Au moins une minuscule",
      !checks.hasUpper && "Au moins une majuscule",
      !checks.hasNumber && "Au moins un chiffre",
      !checks.hasSpecial && "Au moins un caractère spécial",
    ].filter(Boolean),
  };
}

// Export pour compatibilité avec l'ancien format (optionnel, pour migration)
export { deriveKey, validateEncryptedFormat };
