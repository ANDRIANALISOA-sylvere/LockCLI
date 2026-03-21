import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

function getKey(masterPassword) {
  return crypto.scryptSync(masterPassword, "lockcli-salt", 32);
}

export function encrypt(text, masterPassword) {
  const key = getKey(masterPassword);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf-8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(encryptedText, masterPassword) {
  const [ivHex, encryptedHex] = encryptedText.split(":");
  const key = getKey(masterPassword);
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}
