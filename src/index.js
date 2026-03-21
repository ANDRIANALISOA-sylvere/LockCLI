#!/usr/bin/env node

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
  let masterPassword;
  if (!isMasterPasswordSet()) {
    masterPassword = await createMasterPassword();
    await showMenu(masterPassword);

    return;
  }

  masterPassword = await verifyMasterPassword();

  await showMenu(masterPassword);
}

main();
