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
# Interactive menu
lockcli

# Update vault to latest version
lockcli update

# Show version
lockcli --version

# Show help
lockcli --help
```

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
✅ Mot de passe LockCLI créé avec succès

Version du format: 1.1
Chiffrement: AES-256-GCM
Key derivation: scrypt (N=16384, r=8, p=1)
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
├── master.json   ← master hash (bcrypt 14 rounds) + key salt
└── vault.json    ← your credentials (AES-256-GCM encrypted)
```

### Security Architecture (v1.1)

| Component | Algorithm | Parameters |
|-----------|-----------|------------|
| **Encryption** | AES-256-GCM | Authenticated, IV per encryption |
| **Key Derivation** | scrypt | N=16384, r=8, p=1, 32-byte output |
| **Master Hash** | bcrypt | 14 rounds |
| **Salt** | Random | 32 bytes, unique per user |

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY FLOW (v2.0)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User Input          Master Password                      │
│       │                                                       │
│       ▼                                                       │
│  2. Key Derivation    scrypt(master + salt) → 32-byte key    │
│     (scrypt N=16384)   Salt unique par utilisateur           │
│                                                              │
│       │                                                       │
│       ▼                                                       │
│  3. Encryption        AES-256-GCM(key, iv)                   │
│     (AES-256-GCM)      Authentification intégrée             │
│                        IV unique par chiffrement             │
│                                                              │
│       │                                                       │
│       ▼                                                       │
│  4. Storage            salt:iv:authTag:encrypted              │
│     (vault.json)       Format verifiable                     │
│                        Altération détectable                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**What Changed in v1.1:**
- **Unique salt per user** (instead of static "lockcli-salt")
- **AES-256-GCM** (instead of CBC) for authentication
- **bcrypt 14 rounds** (instead of 10)
- **Integrity verification** (GCM auth tag)
- **Version tracking** for future migrations

---

## Demo

```
✔ Entrez votre mot de passe LOCKCLI : ****
✅ Bienvenue sur LockCLI

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
│  1  │ Gmail              │ user@example.com              ••••••••••••  │ 20/03/2026 │
├─────┼────────────────────┼──────────────────────────────┼──────────────┼────────────┤
│  2  │ GitHub             │ developer                     ••••••••••••  │ 20/03/2026 │
└─────┴────────────────────┴──────────────────────────────┴──────────────┴────────────┘
```

---

## Migration from v1.0

**IMPORTANT**: If you are using LockCLI v1.0, you have security vulnerabilities that should be addressed:

- Static salt ("lockcli-salt") allows rainbow table attacks
- AES-256-CBC → no integrity verification
- bcrypt 10 rounds is weak

**Migrate immediately:**

```bash
# Just run the update command
lockcli update

# Or simply run LockCLI - it will prompt you
lockcli
```

The update command will:
1. Ask for your master password
2. Create an automatic backup in `~/.lockcli/backups/`
3. Re-encrypt all entries with the new format
4. Update your vault to v1.1

See [SECURITY.md](SECURITY.md) for details.

---

## Tech Stack

| Package             | Role                                  |
| ------------------- | ------------------------------------- |
| `@inquirer/prompts` | Interactive CLI prompts               |
| `bcrypt`            | Master password hashing (14 rounds)   |
| `crypto`            | AES-256-GCM + scrypt (built-in)       |
| `chalk`             | Terminal colors                       |
| `figlet`            | ASCII banner                          |
| `boxen`             | Styled message boxes                  |
| `cli-table3`        | Table display                         |

---

## Security

### What We Do
- LockCLI password is **never stored in plain text** — hashed with bcrypt (14 rounds)
- Service passwords are **encrypted with AES-256-GCM** — authenticated encryption
- **Unique salt per user** — prevents rainbow table attacks
- All credentials are **stored locally** — no network, no telemetry
- Files have **restrictive permissions** (mode 0600)

### What You Should Do
- Use a **strong master password** (12+ chars, mixed types)
- **Backup regularly** — loss of device = loss of data
- Enable **disk encryption** (BitLocker/FileVault/LUKS)
- Consider storing `~/.lockcli/` on an **encrypted volume**

### Known Limitations
- No built-in cloud sync or multi-device support
- Master password lost = data lost (no recovery)
- Vulnerable to malware with user privileges

> See [SECURITY.md](SECURITY.md) for full security policy and audit information.

---

## Development

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/f-LockCLI.git
cd f-LockCLI
npm install

# Run locally
npm run dev

# Run security tests
npm run test:security

# Build for production
npm run build
```

---

## Contributing

Contributions welcome! Especially for:
- Additional security audits
- Cross-platform testing
- Documentation improvements

Please read [SECURITY.md](SECURITY.md) before contributing.

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

## License

MIT © Sylvère Andrianalisoa

---

## Author

**Sylvère Andrianalisoa** — [@ANDRIANALISOA-sylvere](https://github.com/ANDRIANALISOA-sylvere)

**Security contributions** — Your contributions made this version much more secure!

> Built to learn. Designed to be simple. Now secure by design.
