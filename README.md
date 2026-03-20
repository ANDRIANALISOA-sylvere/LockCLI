# LockCLI

> A secure CLI password manager : store, retrieve and manage your credentials locally from your terminal.

LockCLI stores all your passwords **locally on your machine** , no cloud, no server, no internet connection required. Your data never leaves your computer.

---

## Installation

```bash
npm install -g @josephin/lockcli
```

## Usage

```bash
lockcli
```

That's it , LockCLI will guide you through an interactive menu.

---

## First Launch

On first launch, LockCLI will ask you to create a **lockcli password**. This password protects access to all your stored credentials.

> **Important** : If you forget your lockcli password, your stored credentials cannot be recovered.

---

## Features

```
Ajouter un mot de passe     — store a new service credential
Voir mes mots de passe      — list all stored services in a table
Modifier un mot de passe    — change the password for a service
Supprimer un mot de passe   — remove a service credential
Quitter                     — exit LockCLI
```

---

## How It Works

```
All data is stored locally in ~/.lockcli/

~/.lockcli/
├── master.json   ← hashed lockcli password (bcrypt)
└── vault.json    ← your credentials
```

```
Lockcli password → hashed with bcrypt (never stored in plain text)
```

---

## Demo

```
✔ Entrez votre mot de passe LOCKCLI : ****

? Que voulez-vous faire ?
❯ Ajouter un mot de passe
  Voir mes mots de passe
  Modifier un mot de passe
  Supprimer un mot de passe
  Quitter

┌─────┬────────────────────┬──────────────────────────────┬───────────────┬───────────────┐
│  #  │ Service            │ Username                     │ Password      │ Added on      │
├─────┼────────────────────┼──────────────────────────────┼───────────────┼───────────────┤
│  1  │ Gmail              │ josephinsylvere@gmail.com    │ lockcli       │ 20/03/2026    │
├─────┼────────────────────┼──────────────────────────────┼───────────────┼───────────────┤
│  2  │ Facebook           │ josephin.sylvere             │ lockcli       │ 20/03/2026    │
└─────┴────────────────────┴──────────────────────────────┴───────────────┴───────────────┘
```

---

## Tech Stack

| Package | Role |
|---------|------|
| `@inquirer/prompts` | Interactive CLI prompts |
| `bcrypt` | Password hashing |
| `chalk` | Terminal colors |
| `figlet` | ASCII banner |
| `boxen` | Styled message boxes |
| `cli-table3` | Table display |

---

## Security

- LockCLI password is **never stored in plain text** , hashed with bcrypt
- All credentials are **stored locally** , no network requests
- Data is stored in `~/.lockcli/`, your home directory

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

## Author

**Sylvère Andrianalisoa** : [@ANDRIANALISOA-sylvere](https://github.com/ANDRIANALISOA-sylvere)

> Built to learn. Designed to be simple.