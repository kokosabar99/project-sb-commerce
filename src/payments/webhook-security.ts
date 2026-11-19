/**
 * Provider-neutral payment webhook security helpers.
 * IMPORTANT: each gateway requires its own signature algorithm and canonical
 * signed payload. Never assume every gateway uses HMAC-SHA256.
 */
export function constantTimeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b) || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyHmacSha256(
  rawBody: ArrayBuffer,
  signatureHex: string,
  secret: string
): Promise<boolean> {
  if (!secret || !signatureHex || !/^[a-f0-9]{64}$/i.test(signatureHex)) return false;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const signature = Uint8Array.from(signatureHex.match(/.{2}/g)!, hex => parseInt(hex, 16));
  return crypto.subtle.verify("HMAC", key, signature, rawBody);
}

/**
 * Must run AFTER provider-specific signature verification.
 * Persist event ID with a unique constraint and update order/payment
 * atomically in a database transaction. Reconcile amount/currency/order
 * with server-side payment records; never trust callback status alone.
 */
export type VerifiedPaymentEvent = {
  provider: string;
  providerEventId: string;
  providerTransactionId: string;
  merchantOrderId: string;
  amountMinor: bigint;
  currency: string;
  status: "paid" | "failed" | "expired" | "pending";
};

export function validatePaymentMatch(
  event: VerifiedPaymentEvent,
  expected: { orderId: string; amountMinor: bigint; currency: string; providerTransactionId: string }
): boolean {
  return event.merchantOrderId === expected.orderId &&
    event.providerTransactionId === expected.providerTransactionId &&
    event.amountMinor === expected.amountMinor &&
    event.currency === expected.currency &&
    event.amountMinor > 0n;
}
