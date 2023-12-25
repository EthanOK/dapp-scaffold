import { verify } from "@noble/ed25519";

import bs58 from "bs58";

// (Uint8Array, Uint8Array, PublicKey)
export const verifySignature_solana = async (signature, message, publicKey) => {
  return await verify(signature, message, publicKey.toBytes());
};

module.exports = { verifySignature_solana };
