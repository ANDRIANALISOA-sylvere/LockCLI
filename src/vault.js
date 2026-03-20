import bcrypt from "bcrypt";
import fs from "fs";
import { LOCKCLI_DIR } from "./auth.js";

export const VAULT_FILE = LOCKCLI_DIR + "/vault.json";

function readVault() {
  if (!fs.existsSync(VAULT_FILE)) return [];
  return JSON.parse(fs.readFileSync(VAULT_FILE, "utf-8"));
}

function saveVault(data) {
  fs.writeFileSync(VAULT_FILE, JSON.stringify(data, null, 2));
}

async function addPassword(service, username, password) {
  const vault = readVault();
  vault.push({
    service,
    username,
    password,
    createdAt: Date.now(),
  });

  saveVault(vault);
  console.log(`Mot de passe pour "${service}" ajouté avec succès`);
}

function getPasswords() {
  return readVault();
}

async function deletePassword(service) {
  const vault = readVault();

  const exists = vault.find((item) => item.service === service);
  if (!exists) {
    console.log(`Service "${service}" introuvable`);
    return;
  }

  const updated = vault.filter((item) => item.service !== service);
  saveVault(updated);
  console.log(`Service "${service}" supprimé`);
}

async function updatePassword(service, password) {
  const vault = readVault();

  const item = vault.find((item) => item.service === service);
  if (!item) {
    console.log(`Service "${service}" introuvable`);
    return;
  }

  item.password = password;
  item.updatedAt = Date.now();

  saveVault(vault);
  console.log(`Mot de passe pour "${service}" mis à jour`);
}

export { addPassword, getPasswords, deletePassword, updatePassword };
