import { select, input, password, confirm } from "@inquirer/prompts";
import {
  addPassword,
  deletePassword,
  getPasswords,
  updatePassword,
} from "./vault.js";
import { CONSTANT } from "./constants.js";
import chalk from "chalk";
import Table from "cli-table3";
import boxen from "boxen";

async function showMenu(masterPassword) {
  const action = await select({
    message: "Que voulez-vous faire ?",
    choices: [
      { name: "Ajouter un mot de passe", value: CONSTANT.ADD_PASSWOR },
      { name: "Voir mes mots de passe", value: CONSTANT.SEE_PASSWORD },
      { name: "Modifier un mot de passe", value: CONSTANT.UPDATED_PASSWORD },
      { name: "Supprimer un mot de passe", value: CONSTANT.DELETE_PASSWORD },
      { name: "Quitter", value: "exit" },
    ],
  });

  switch (action) {
    case CONSTANT.ADD_PASSWOR:
      await handleAdd(masterPassword);
      break;
    case CONSTANT.SEE_PASSWORD:
      handleShow(masterPassword);
      break;
    case CONSTANT.UPDATED_PASSWORD:
      await handleUpdate(masterPassword);
      break;
    case CONSTANT.DELETE_PASSWORD:
      await handleDelete(masterPassword);
      break;
    case CONSTANT.EXIT:
      console.log(
        boxen(chalk.yellow("Au revoir !"), {
          padding: 1,
          borderColor: "yellow",
          borderStyle: "round",
        }),
      );
      process.exit(0);
  }

  await showMenu(masterPassword);
}

async function handleAdd(masterPassword) {
  const service = await input({ message: "Nom du service (ex: Facebook) :" });
  const username = await input({ message: "Username ou email ou Num Tel:" });
  const pass = await password({ message: "Mot de passe :", mask: "*" });
  await addPassword(service, username, pass, masterPassword);
}

function handleShow(masterPassword) {
  const passwords = getPasswords(masterPassword);

  if (passwords.length === 0) {
    console.log(
      boxen(chalk.yellow("Aucun mot de passe enregistré"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
    return;
  }

  const table = new Table({
    head: [
      chalk.yellow("#"),
      chalk.yellow("Service"),
      chalk.yellow("Username"),
      chalk.yellow("Mot de passe"),
      chalk.yellow("Ajouté le"),
    ],
    colWidths: [5, 20, 30, 15, 15],
    style: { border: ["gray"] },
  });

  passwords.forEach((item, index) => {
    table.push([
      chalk.white(index + 1),
      chalk.bold.cyan(item.service),
      chalk.white(item.username),
      chalk.red(item.password),
      chalk.dim(new Date(item.createdAt).toLocaleDateString("fr-FR")),
    ]);
  });

  console.log("\n" + chalk.bold.white("  Vos mots de passe\n"));
  console.log(table.toString());
}

async function handleUpdate(masterPassword) {
  const passwords = getPasswords(masterPassword);
  if (passwords.length === 0) {
    console.log(
      boxen(chalk.yellow("Aucun mot de passe enregistré"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
    return;
  }

  const service = await select({
    message: "Quel service modifier ?",
    choices: passwords.map((item) => ({
      name: item.service,
      value: item.service,
    })),
  });

  const newPass = await password({
    message: "Nouveau mot de passe :",
    mask: "*",
  });
  await updatePassword(service, newPass, masterPassword);
}

async function handleDelete(masterPassword) {
  const passwords = getPasswords(masterPassword);
  if (passwords.length === 0) {
    console.log(
      boxen(chalk.yellow("Aucun mot de passe enregistré"), {
        padding: 1,
        borderColor: "yellow",
        borderStyle: "round",
      }),
    );
    return;
  }

  const service = await select({
    message: "Quel service supprimer ?",
    choices: passwords.map((item) => ({
      name: item.service,
      value: item.service,
    })),
  });

  const ok = await confirm({
    message: `Confirmer la suppression de "${service}" ?`,
    default: false,
  });

  if (ok) {
    await deletePassword(service);
  } else {
    console.log(
      boxen(chalk.red("Suppression annulée"), {
        padding: 1,
        borderColor: "red",
        borderStyle: "round",
      }),
    );
  }
}

export { showMenu };
