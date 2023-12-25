import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

export const signMessage_solana = async (string) => {
  const { publicKey, signMessage } = useWallet();
  const message = Buffer.from(string);
  const signature = await signMessage(message);
  return bs58.encode(signature);
};

module.exports = { signMessage_solana };
