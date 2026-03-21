import fs from "fs";
import { LOCKCLI_DIR } from "./auth.js";
import boxen from "boxen";
import chalk from "chalk";
import { decrypt, encrypt } from "./crypto.js";

export const VAULT_FILE = LOCKCLI_DIR + "/vault.json";

function readVault() {
  if (!fs.existsSync(VAULT_FILE)) return [];
  return JSON.parse(fs.readFileSync(VAULT_FILE, "utf-8"));
}

function saveVault(data) {
  fs.writeFileSync(VAULT_FILE, JSON.stringify(data, null, 2));
}

async function addPassword(service, username, password, masterPassword) {
  const vault = readVault();
  vault.push({
    service,
    username,
    password: encrypt(password, masterPassword),
    createdAt: Date.now(),
  });

  saveVault(vault);
  console.log(
    boxen(chalk.green(`Mot de passe pour "${service}" ajouté avec succès`), {
      padding: 1,
      borderColor: "green",
      borderStyle: "round",
    }),
  );
}

function getPasswords(masterPassword) {
  const vault = readVault();
  return vault.map((item) => ({
    ...item,
    password: decrypt(item.password, masterPassword),
  }));
}

async function deletePassword(service) {
  const vault = readVault();

  const exists = vault.find((item) => item.service === service);
  if (!exists) {
    console.log(
      boxen(chalk.yellow(`Service "${service}" introuvable`), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
    return;
  }

  const updated = vault.filter((item) => item.service !== service);
  saveVault(updated);
  console.log(
    boxen(chalk.green(`Service "${service}" supprimé`), {
      padding: 1,
      borderColor: "green",
      borderStyle: "round",
    }),
  );
}

async function updatePassword(service, password, masterPassword) {
  const vault = readVault();

  const item = vault.find((item) => item.service === service);
  if (!item) {
    console.log(
      boxen(chalk.yellow(`Service "${service}" introuvable`), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
    return;
  }

  item.password = encrypt(password, masterPassword);
  item.updatedAt = Date.now();

  saveVault(vault);
  console.log(
    boxen(chalk.green(`Mot de passe pour "${service}" mis à jour`), {
      padding: 1,
      borderColor: "green",
      borderStyle: "round",
    }),
  );
}

export { addPassword, getPasswords, deletePassword, updatePassword };
