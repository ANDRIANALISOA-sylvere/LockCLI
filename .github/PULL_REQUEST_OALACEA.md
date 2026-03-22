# Security Improvements - LockCLI v1.1.0

## Summary

This PR addresses **security vulnerabilities** identified in LockCLI v1.0 and implements modern cryptographic best practices.

**Previous issues fixed:**
- Static salt "lockcli-salt" → Unique salt per user
- AES-256-CBC (no integrity) → AES-256-GCM (authenticated)
- bcrypt 10 rounds → bcrypt 14 rounds
- No integrity verification → GCM auth tag
- No migration path → Migration script included

---

## Critical Changes

### crypto.js - Complete Rewrite
- **Before**: `scryptSync(password, "lockcli-salt", 32)` (static!)
- **After**: `scryptSync(password, random32ByteSalt, 32, {N:16384, r:8, p:1})`

### auth.js - Enhanced Security
- bcrypt rounds: `10` → `14`
- Added `keySalt` generation and storage
- Version tracking for migrations

### vault.js - Integrity Checks
- Validates encrypted format before decrypting
- Shows errors for corrupted data
- Uses master.json's keySalt for all operations

---

## Files Changed

```
src/
├── crypto.js        │ Complete rewrite - AES-256-GCM + unique salt
├── auth.js          │ Enhanced - bcrypt 14 + salt management
├── vault.js         │ Updated - Uses keySalt from master.json
├── menu.js          │ Updated - Passes keySalt to operations
└── index.js         │ Updated - Handles auth data properly

tests/
└── crypto.test.js   │ NEW - Security test suite

README.md            │ Updated - Security section + v1.1 features
SECURITY.md          │ NEW - Full security policy
package.json         │ Updated - v1.1.0 + new scripts
```

---

## Testing

```bash
# Run security tests
npm run test:security

# Expected output:
# encryption/decryption
# integrity verification
# wrong password rejection
# corrupted data detection
# password strength validation
```

---

## Security Improvements

| Area | Before | After |
|------|--------|-------|
| **Encryption** | AES-256-CBC | AES-256-GCM |
| **Integrity** | None | GCM auth tag |
| **Salt** | Static ("lockcli-salt") | Random 32 bytes |
| **KDF Cost** | Default | N=16384, r=8, p=1 |
| **Hash Rounds** | 10 | 14 |
| **File Perms** | None | 0600/0700 |

---

## Documentation

- Updated README with security architecture diagram
- Added SECURITY.md with full policy
- Added inline code documentation
- Migration instructions included

---

## Test Results

All security tests passing:
```
LockCLI - Tests de securite crypto

Tests de chiffrement/dechiffrement:
  Le texte chiffre est different du texte en clair
  Le dechiffrement restitue le texte original
  Le format chiffre contient des separateurs
  Le format chiffre est valide

Tests de robustesse:
  Dechiffrement avec mauvais mot de passe echoue
  Dechiffrement avec format invalide echoue
  Chiffrement de texte vide echoue
  Dechiffrement de donnees corrompues echoue (authentification GCM)

...

Resultat: 23 OK | 0 FAILED
```

---

## Review Checklist

- [x] All crypto changes reviewed
- [x] No hardcoded secrets
- [x] Tests added and passing
- [x] Documentation updated
- [x] Migration script tested
- [x] SECURITY.md added

---

## Additional Notes

- Consider security audit by third party for future release
- Announcement should encourage users to migrate

---

## Credits

Security improvements contributed by @yanis (GitHub)

**References:**
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST Special Publication 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [RFC 7914 - scrypt](https://datatracker.ietf.org/doc/html/rfc7914)
