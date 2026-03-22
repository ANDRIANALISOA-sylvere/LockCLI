# Changelog

All notable changes to LockCLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-21

### Added
- **AES-256-GCM encryption** (authenticated encryption)
- **Unique salt per user** (32 bytes, cryptographically random)
- **Migration script** (`npm run migrate`) for v1.0 vaults
- **Security test suite** (`npm run test:security`)
- **SECURITY.md** - Full security policy documentation
- **Password strength validation** with recommendations
- **Data integrity verification** (GCM authentication tag)
- **File permissions** (0600 for files, 0700 for directory)
- **Version tracking** in master.json for future migrations
- **Corrupted data detection** with clear error messages

### Changed
- **bcrypt rounds**: 10 → 14
- **Key derivation**: Default scrypt → N=16384, r=8, p=1
- **Encryption algorithm**: AES-256-CBC → AES-256-GCM
- **Salt management**: Static "lockcli-salt" → Unique per user
- **README**: Added security architecture diagram
- **package.json**: Added test and migrate scripts

### Security Fixes
- Fixed static salt vulnerability (rainbow table attacks possible)
- Fixed missing integrity verification (CBC malleability)
- Fixed weak bcrypt rounds (10 → 14)
- Added authentication tag to prevent data tampering

### Removed
- Deprecated crypto.js functions (static salt)

---

## [1.0.5] - 2025-03-20

### Added
- Initial public release
- Basic password management features
- Interactive CLI menu

### Known Issues (Security)
- **Static salt vulnerability** - All users with same password have same key
- **No integrity verification** - Encrypted data can be tampered with
- **Weak bcrypt rounds** - Only 10 rounds

---

## Migration Guide (v1.0 → v1.1)

### Step 1: Backup
```bash
cp -r ~/.lockcli ~/.lockcli.backup
```

### Step 2: Update
```bash
npm update -g @josephin/lockcli
# or
git pull && npm install
```

### Step 3: Migrate
```bash
npm run migrate
```

### Step 4: Verify
```bash
lockcli
# Check that your passwords are accessible
```

### Step 5: Cleanup (if verified)
```bash
rm -rf ~/.lockcli.backup
```

---

## Security Advisory

If you are using LockCLI v1.0.x, **upgrade immediately**. The following vulnerabilities have been identified:

| CVE | Severity | Description | Fixed In |
|-----|----------|-------------|----------|
| Pending | CRITICAL | Static salt allows rainbow table attacks | 1.1.0 |
| Pending | HIGH | CBC mode allows data tampering without detection | 1.1.0 |
| Pending | MEDIUM | Weak bcrypt rounds (10) | 1.1.0 |

---

## Future Plans

### [1.2.0] - Planned
- Add backup command (encrypted export)
- Add import from other password managers
- Add password generator
- Add two-factor authentication option

### [2.0.0] - Considering
- Multi-device sync (encrypted)
- Hardware key support (YubiKey)
- SSH key integration
- TOTP support

---

[1.1.0]: https://github.com/ANDRIANALISOA-sylvere/LockCLI/compare/v1.0.5...v1.1.0
[1.0.5]: https://github.com/ANDRIANALISOA-sylvere/LockCLI/releases/tag/v1.0.5
