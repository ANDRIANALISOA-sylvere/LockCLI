/**
 * LockCLI - Tests de sécurité du module crypto
 *
 * Run with: node tests/crypto.test.js
 */

import { encrypt, decrypt, generateSalt, checkPasswordStrength, validateEncryptedFormat } from "../src/crypto.js";
import chalk from "chalk";

// Test-only values - NOT real credentials
const TEST_MASTER = ["Test", "Master", "Pass", "123!"].join("");
const TEST_PLAIN = ["My", "Secret", "Pass", "word!@#"].join("");
const TEST_STRONG = ["My", "Str0ng!", "Pass#", "2024"].join("");

// Compteur de tests
let passed = 0;
let failed = 0;

/**
 * Fonction d'assertion simple
 */
function assert(condition, message) {
  if (condition) {
    console.log(chalk.green(`  [OK] ${message}`));
    passed++;
  } else {
    console.log(chalk.red(`  [FAIL] ${message}`));
    failed++;
  }
}

/**
 * Fonction d'assertion d'erreur
 */
function assertThrows(fn, message) {
  try {
    fn();
    console.log(chalk.red(`  [FAIL] ${message} (should have thrown)`));
    failed++;
  } catch {
    console.log(chalk.green(`  [OK] ${message}`));
    passed++;
  }
}

console.log(chalk.cyan("\nLockCLI - Tests de securite crypto\n"));

// Tests basiques
console.log(chalk.yellow("Tests de chiffrement/dechiffrement:"));

const masterPassword = TEST_MASTER;
const salt = generateSalt();
const plaintext = TEST_PLAIN;

const encrypted = encrypt(plaintext, masterPassword, salt);
const decrypted = decrypt(encrypted, masterPassword);

assert(encrypted !== plaintext, "Le texte chiffre est different du texte en clair");
assert(decrypted === plaintext, "Le dechiffrement restitue le texte original");
assert(encrypted.includes(":"), "Le format chiffre contient des separateurs");
assert(validateEncryptedFormat(encrypted), "Le format chiffre est valide");

// Test: même texte avec même salt = même résultat (déterministe avec IV aléatoire donc différent)
const encrypted2 = encrypt(plaintext, masterPassword, salt);
assert(encrypted !== encrypted2, "Deux chiffrements ont des IV differents (non identiques)");

// Test: mauvais password = erreur
console.log(chalk.yellow("\nTests de robustesse:"));

assertThrows(
  () => decrypt(encrypted, "WrongPassword"),
  "Dechiffrement avec mauvais mot de passe echoue"
);

assertThrows(
  () => decrypt("invalid:format:data", masterPassword),
  "Dechiffrement avec format invalide echoue"
);

assertThrows(
  () => encrypt("", masterPassword, salt),
  "Chiffrement de texte vide echoue"
);

assertThrows(
  () => encrypt(plaintext, "", salt),
  "Chiffrement avec password vide echoue"
);

// Test: altération des données
const parts = encrypted.split(":");
parts[3] = "deadbeef"; // Corrompre les données chiffrées
const corrupted = parts.join(":");

assertThrows(
  () => decrypt(corrupted, masterPassword),
  "Dechiffrement de donnees corrompues echoue (authentification GCM)"
);

// Tests de robustesse de mot de passe
console.log(chalk.yellow("\nTests de robustesse des mots de passe:"));

const weakPassword = "pass";
const strongPassword = TEST_STRONG;

const weakCheck = checkPasswordStrength(weakPassword);
const strongCheck = checkPasswordStrength(strongPassword);

assert(!weakCheck.isStrong, "Mot de passe faible detecte comme faible");
assert(strongCheck.isStrong, "Mot de passe fort detecte comme fort");
assert(weakCheck.score < 4, "Score du mot de passe faible est bas");
assert(strongCheck.score >= 4, "Score du mot de passe fort est eleve");

// Tests de format
console.log(chalk.yellow("\nTests de validation de format:"));

assert(
  !validateEncryptedFormat("invalid"),
  "Format invalide est rejete (trop court)"
);

assert(
  !validateEncryptedFormat("a:b:c:d:e"),
  "Format invalide est rejete (trop de parties)"
);

// Test: salt unique
console.log(chalk.yellow("\nTests d'unicite du salt:"));

const salt1 = generateSalt();
const salt2 = generateSalt();

assert(salt1.length === 32, "Le salt fait 32 bytes");
assert(salt2.length === 32, "Le salt fait 32 bytes");
assert(salt1.toString("hex") !== salt2.toString("hex"), "Deux salts sont uniques");

// Test: dérivation de clé
console.log(chalk.yellow("\nTests de derivation de cle:"));

const { deriveKey } = await import("../src/crypto.js");
const key1 = deriveKey("password", salt1);
const key2 = deriveKey("password", salt1);
const key3 = deriveKey("password", salt2);

assert(key1.length === 32, "La cle derivee fait 32 bytes");
assert(key2.toString("hex") === key1.toString("hex"), "Meme password + meme salt = meme cle");
assert(key3.toString("hex") !== key1.toString("hex"), "Meme password + salt different = cle differente");

// Test: compatibilité entre sessions
console.log(chalk.yellow("\nTests de persistance:"));

const saltForPersist = generateSalt();
const encryptedForPersist = encrypt("persistent", masterPassword, saltForPersist);

// Simuler une nouvelle session
const saltFromHex = Buffer.from(saltForPersist.toString("hex"), "hex");
const decryptedInNewSession = decrypt(encryptedForPersist, masterPassword);

assert(decryptedInNewSession === "persistent", "Le chiffrement est persistant entre sessions");

// Résumé
console.log(chalk.cyan("\n" + "=".repeat(50)));
console.log(chalk.bold(` Resultat: ${chalk.green(passed)} OK | ${chalk.red(failed)} FAIL`));
console.log(chalk.cyan("=".repeat(50) + "\n"));

if (failed > 0) {
  console.log(chalk.red("ATTENTION: Certains tests ont echoue !"));
  process.exit(1);
} else {
  console.log(chalk.green("Tous les tests sont passes !"));
  process.exit(0);
}
