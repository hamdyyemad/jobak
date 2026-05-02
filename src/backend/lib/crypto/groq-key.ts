// AES-256-GCM encryption for Groq API keys stored in Supabase.
// ENCRYPTION_SECRET must be a 32-byte hex string (64 hex chars) in env.

const ALG = "AES-GCM";

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length !== 64) {
    throw new Error("ENCRYPTION_SECRET must be a 64-char hex string (32 bytes)");
  }
  return crypto.subtle.importKey(
    "raw",
    hexToBuffer(secret),
    { name: ALG, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptGroqKey(plaintext: string): Promise<string> {
  const key = await getKey();
  const ivBuffer = crypto.getRandomValues(new Uint8Array(12)).buffer as ArrayBuffer;
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALG, iv: ivBuffer },
    key,
    encoded
  );
  return `${bufferToHex(ivBuffer)}:${bufferToHex(ciphertext)}`;
}

export async function decryptGroqKey(encrypted: string): Promise<string> {
  const [ivHex, ciphertextHex] = encrypted.split(":");
  if (!ivHex || !ciphertextHex) throw new Error("Invalid encrypted key format");
  const key = await getKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: ALG, iv: hexToBuffer(ivHex) },
    key,
    hexToBuffer(ciphertextHex)
  );
  return new TextDecoder().decode(plaintext);
}
