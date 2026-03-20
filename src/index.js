import {
  createMasterPassword,
  isMasterPasswordSet,
  verifyMasterPassword,
} from "./auth.js";
import figlet from "figlet";
import chalk from "chalk";
import { showMenu } from "./menu.js";

function showBanner() {
  console.log(chalk.yellow(figlet.textSync("LockCLI", { font: "Big" })));
  console.log(chalk.gray(" Your local password manager\n"));
}

async function main() {
  showBanner();
  if (!isMasterPasswordSet()) {
    await createMasterPassword();
    await showMenu();

    return;
  }

  await verifyMasterPassword();

  await showMenu();
}

main();
