import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { notify } from "../utils/notifications";
import useUserSOLBalanceStore from "../stores/useUserSOLBalanceStore";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  generateSigner,
  transactionBuilder,
  publicKey,
  some,
  Option,
} from "@metaplex-foundation/umi";
import {
  SolPayment,
  fetchCandyGuard,
  fetchCandyMachine,
  getSolPaymentSerializer,
  mintV2,
  mplCandyMachine,
  safeFetchCandyGuard,
  solPaymentGuardManifest,
} from "@metaplex-foundation/mpl-candy-machine";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  getSplAddressLookupTableProgram,
  setComputeUnitLimit,
} from "@metaplex-foundation/mpl-toolbox";
import { LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import * as bs58 from "bs58";

// These access the environment variables we defined in the .env file
const quicknodeEndpoint =
  process.env.NEXT_PUBLIC_RPC || clusterApiUrl("devnet");
const candyMachineAddress = publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
const treasury = publicKey(process.env.NEXT_PUBLIC_TREASURY);

export const CandyMint: FC = () => {
  const [mintPrice, setMintPrice] = useState(0);
  const [destination, setDestination] = useState("");
  const [remainAmount, setRemainAmount] = useState(0);
  const { connection } = useConnection();
  const wallet = useWallet();
  const { getUserSOLBalance } = useUserSOLBalanceStore();

  const umi = useMemo(
    () =>
      createUmi(quicknodeEndpoint)
        .use(walletAdapterIdentity(wallet))
        .use(mplCandyMachine())
        .use(mplTokenMetadata()),
    [
      wallet,
      mplCandyMachine,
      walletAdapterIdentity,
      mplTokenMetadata,
      quicknodeEndpoint,
      createUmi,
    ]
  );

  useEffect(() => {
    // const intervalId = setInterval(updateData, 5000);
    // return () => {
    //   clearInterval(intervalId);
    // };
    updateData();
  }, []);

  const updateData = async () => {
    try {
      const candyMachine = await fetchCandyMachine(umi, candyMachineAddress);
      console.log(candyMachine);
      const amount =
        Number(candyMachine.itemsLoaded) - Number(candyMachine.itemsRedeemed);
      setRemainAmount(amount);
      const candyGuard = await fetchCandyGuard(umi, candyMachine.mintAuthority);

      const solPayment = candyGuard.guards.solPayment; // Sol Payment settings.
      const result = processPayment(solPayment);
      setDestination(result.destination.toString());
      setMintPrice(Number(result.lamports.basisPoints) / LAMPORTS_PER_SOL);
    } catch (error) {}
  };
  const processPayment = (paymentOption: Option<SolPayment>) => {
    if (paymentOption.__option === "Some") {
      const paymentValue = paymentOption.value;
      return paymentValue;
      // 处理 paymentValue
    } else {
      // 处理不存在值的情况
      console.log("值不存在");
      return null;
    }
  };
  const onClick = useCallback(async () => {
    if (!wallet.publicKey) {
      console.log("error", "Wallet not connected!");
      notify({
        type: "error",
        message: "error",
        description: "Wallet not connected!",
      });
      return;
    }

    // Fetch the Candy Machine.
    const candyMachine = await fetchCandyMachine(umi, candyMachineAddress);

    // Fetch the Candy Guard.
    const candyGuard = await safeFetchCandyGuard(
      umi,
      candyMachine.mintAuthority
    );
    const solPayment = candyGuard.guards.solPayment;
    // console.log(solPayment);
    try {
      // Mint from the Candy Machine.
      const nftMint = generateSigner(umi);

      console.log(nftMint);

      console.log("NFT Account:", nftMint.publicKey);

      const transaction = await transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(
          mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            candyGuard: candyGuard?.publicKey,
            nftMint,
            collectionMint: candyMachine.collectionMint,
            collectionUpdateAuthority: candyMachine.authority,
            mintArgs: {
              solPayment: solPayment,
            },
          })
        );
      const { signature } = await transaction.sendAndConfirm(umi, {
        confirm: { commitment: "confirmed" },
      });
      const txid = bs58.encode(signature);
      console.log("success", `Mint successful! ${txid}`);
      notify({ type: "success", message: "Mint successful!", txid });

      getUserSOLBalance(wallet.publicKey, connection);
    } catch (error: any) {
      notify({
        type: "error",
        message: `Error minting!`,
        description: error?.message,
      });
      console.log("error", `Mint failed! ${error?.message}`);
    }
  }, [
    wallet,
    connection,
    getUserSOLBalance,
    umi,
    candyMachineAddress,
    treasury,
  ]);

  return (
    <div>
      <div>
        <label>Remain: {remainAmount} </label>
        <p></p>
        <label>Price: {mintPrice} SOL</label>
      </div>

      <div></div>
      <div className="relative group items-center flex flex-row justify-center">
        <div
          className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                    rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"
        ></div>

        <button
          className="px-8 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
          onClick={onClick}
        >
          <span> Mint NFT </span>
        </button>
      </div>
    </div>
  );
};
