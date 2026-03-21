# LockCLI

> A secure CLI password manager — store, retrieve and manage your credentials locally from your terminal.

LockCLI stores all your passwords **locally on your machine** — no cloud, no server, no internet connection required. Your data never leaves your computer.

---

## Installation

```bash
npm install -g @josephin/lockcli
```

## Usage

```bash
lockcli
```

That's it — LockCLI will guide you through an interactive menu.

---

## First Launch

On first launch, LockCLI will ask you to create a **LockCLI master password**. This password protects access to all your stored credentials.

```
  _                _     ____ _     ___
 | |    ___   ___| | __ / ___| |   |_ _|
 | |   / _ \ / __| |/ /| |   | |    | |
 | |__| (_) | (__|   < | |___| |___ | |
 |_____\___/ \___|_|\_\ \____|_____|___|

  Your local password manager

✔ Créez votre mot de passe LOCKCLI : ****
✅ Mot de passe master créé avec succès !
```

> **Important** — If you forget your LockCLI password, your stored credentials cannot be recovered.

---

## Features

```
Ajouter un mot de passe    — store a new service credential
Voir mes mots de passe     — list all stored services in a table
Modifier un mot de passe   — change the password for a service
Supprimer un mot de passe  — remove a service credential
Quitter                    — exit LockCLI
```

---

## How It Works

```
All data is stored locally in ~/.lockcli/

~/.lockcli/
├── master.json   ← hashed LockCLI password (bcrypt)
└── vault.json    ← your credentials (AES-256 encrypted)
```

```
LockCLI password  → hashed with bcrypt (never stored in plain text)
Service passwords → encrypted with AES-256 using your master password
                    only you can decrypt them
```

---

## Demo

```
✔ Entrez votre mot de passe LOCKCLI : ****
Accès autorisé !

? Que voulez-vous faire ?
❯ Ajouter un mot de passe
  Voir mes mots de passe
  Modifier un mot de passe
  Supprimer un mot de passe
  Quitter
↑↓ naviguer • ⏎ sélectionner

  Vos mots de passe

┌─────┬────────────────────┬──────────────────────────────┬──────────────┬────────────┐
│  #  │ Service            │ Username                     │ Mot de passe │ Ajouté le  │
├─────┼────────────────────┼──────────────────────────────┼──────────────┼────────────┤
│  1  │ Gmail              │ josephinsylvere@gmail.com    │ monSecret123 │ 20/03/2026 │
├─────┼────────────────────┼──────────────────────────────┼──────────────┼────────────┤
│  2  │ Facebook           │ josephin.sylvere             │ fb@2026!     │ 20/03/2026 │
└─────┴────────────────────┴──────────────────────────────┴──────────────┴────────────┘
```

---

## Tech Stack

| Package             | Role                                  |
| ------------------- | ------------------------------------- |
| `@inquirer/prompts` | Interactive CLI prompts               |
| `bcrypt`            | Master password hashing               |
| `chalk`             | Terminal colors                       |
| `figlet`            | ASCII banner                          |
| `boxen`             | Styled message boxes                  |
| `cli-table3`        | Table display                         |
| `crypto`            | AES-256 encryption (built-in Node.js) |

---

## Security

- LockCLI password is **never stored in plain text** — hashed with bcrypt
- Service passwords are **encrypted with AES-256** — unreadable without your master password
- All credentials are **stored locally** — no network requests, no telemetry
- Data is stored in `~/.lockcli/` — your home directory only

---

## NPM

```bash
# Install
npm install -g @josephin/lockcli

# Update
npm update -g @josephin/lockcli

# Uninstall
npm uninstall -g @josephin/lockcli
```

[View on npm](https://www.npmjs.com/package/@josephin/lockcli)

---

## Contributing

Contributions are welcome! Here's how to get started:
```bash
# Clone the repository
git clone https://github.com/ANDRIANALISOA-sylvere/LockCLI
cd LockCLI

# Install dependencies
npm install

# Run locally
npm start
```

Feel free to open an issue or submit a pull request on [GitHub](https://github.com/ANDRIANALISOA-sylvere/LockCLI).

## Author

**Sylvère Andrianalisoa** — [@ANDRIANALISOA-sylvere](https://github.com/ANDRIANALISOA-sylvere)

> Built to learn. Designed to be simple.
