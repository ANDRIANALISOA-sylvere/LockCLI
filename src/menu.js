import { select, input, password, confirm } from "@inquirer/prompts";
import {
  addPassword,
  deletePassword,
  getPasswords,
  updatePassword,
} from "./vault.js";
import { CONSTANT } from "./constants.js";

function formatDate(date) {
  return date.getFullYear();
}

async function showMenu() {
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
      await handleAdd();
      break;
    case CONSTANT.SEE_PASSWORD:
      handleShow();
      break;
    case CONSTANT.UPDATED_PASSWORD:
      await handleUpdate();
      break;
    case CONSTANT.DELETE_PASSWORD:
      await handleDelete();
      break;
    case CONSTANT.EXIT:
      console.log("Au revoir !");
      process.exit(0);
  }

  await showMenu();
}

async function handleAdd() {
  const service = await input({ message: "Nom du service (ex: Facebook) :" });
  const username = await input({ message: "Username ou email ou Num Tel:" });
  const pass = await password({ message: "Mot de passe :", mask: "*" });
  await addPassword(service, username, pass);
}

function handleShow() {
  const passwords = getPasswords();

  if (passwords.length === 0) {
    console.log("Aucun mot de passe enregistré");
    return;
  }

  console.log("\n Vos mots de passe :\n");
  passwords.forEach((item, index) => {
    console.log(`${index + 1}. ${item.service}`);
    console.log(`   Username : ${item.username}`);
    console.log(`   Mot de passe : ${item.password}`);
    console.log(`   Ajouté le : ${new Date(item.createdAt).toLocaleDateString()}\n`);
  });
}

async function handleUpdate() {
  const passwords = getPasswords();
  if (passwords.length === 0) {
    console.log("Aucun mot de passe enregistré");
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
  await updatePassword(service, newPass);
}

async function handleDelete() {
  const passwords = getPasswords();
  if (passwords.length === 0) {
    console.log("Aucun mot de passe enregistré");
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
    console.log("Suppression annulée");
  }
}

export { showMenu };
