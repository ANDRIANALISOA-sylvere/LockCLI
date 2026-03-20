import fs from "fs";
import bcrypt from "bcrypt";
import os from "os";
import { password } from "@inquirer/prompts";

export const LOCKCLI_DIR = os.homedir() + "/.lockcli";
const MASTER_FILE = LOCKCLI_DIR + "/master.json";

function isMasterPasswordSet() {
  return fs.existsSync(MASTER_FILE);
}

async function createMasterPassword() {
  const pass = await password({
    message: "Créez votre mot de passe LOCKCLI :",
    mask: "*",
  });

  const hash = await bcrypt.hash(pass, 10);
  if (!fs.existsSync(LOCKCLI_DIR)) {
    fs.mkdirSync(LOCKCLI_DIR);
  }

  const data = {
    master: hash,
    createdAt: Date.now(),
  };

  fs.writeFileSync(MASTER_FILE, JSON.stringify(data, null, 2));
  console.log("Mot de passe LockCLI crée avec succès");
}

async function verifyMasterPassword() {
  const pass = await password({
    message: "Entrez votre mot de passe LOCKCLI :",
    mask: "*",
  });

  const data = JSON.parse(fs.readFileSync(MASTER_FILE, "utf-8"));
  const isValid = await bcrypt.compare(pass, data.master);

  if (!isValid) {
    console.log("Mot de passe incorrect");
    process.exit(1);
  }

  console.log("Accès autorisé");
  return true;
}

export { isMasterPasswordSet, createMasterPassword, verifyMasterPassword };
