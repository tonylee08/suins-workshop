// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";
import { namedPackagesPlugin, Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";
import { bcs } from "@mysten/sui/bcs";

const SUI = process.env.SUI_BINARY ?? `sui`;
const mainnetPlugin = namedPackagesPlugin({
  url: "https://mainnet.mvr.mystenlabs.com",
});

const testnetPlugin = namedPackagesPlugin({
  url: "https://testnet.mvr.mystenlabs.com",
});

export const getActiveAddress = () => {
  return execSync(`${SUI} client active-address`, { encoding: "utf8" }).trim();
};

export const getSigner = () => {
  if (process.env.PRIVATE_KEY) {
    console.log("Using supplied private key.");
    const { schema, secretKey } = decodeSuiPrivateKey(process.env.PRIVATE_KEY);

    if (schema === "ED25519") return Ed25519Keypair.fromSecretKey(secretKey);
    if (schema === "Secp256k1")
      return Secp256k1Keypair.fromSecretKey(secretKey);
    if (schema === "Secp256r1")
      return Secp256r1Keypair.fromSecretKey(secretKey);

    throw new Error("Keypair not supported.");
  }

  const sender = getActiveAddress();

  const keystore = JSON.parse(
    readFileSync(
      path.join(homedir(), ".sui", "sui_config", "sui.keystore"),
      "utf8"
    )
  );

  for (const priv of keystore) {
    const raw = fromBase64(priv);
    if (raw[0] !== 0) {
      continue;
    }

    const pair = Ed25519Keypair.fromSecretKey(raw.slice(1));
    if (pair.getPublicKey().toSuiAddress() === sender) {
      return pair;
    }
  }

  throw new Error(`keypair not found for sender: ${sender}`);
};

export const signAndExecute = async (txb: Transaction, network: Network) => {
  const client = getClient(network);
  const signer = getSigner();

  return client.signAndExecuteTransaction({
    transaction: txb,
    signer,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });
};
export const getClient = (network: Network) => {
  const url = process.env.RPC_URL || getFullnodeUrl(network);
  return new SuiClient({ url });
};

export type Network = "mainnet" | "testnet" | "devnet" | "localnet";

(async () => {
  // Update constant for env
  const env = "testnet";
  const packageId =
    "0x0267e8169a38e8fc50076de2b6fe901290aa059cbd3e44d736d08b4d296aea7d";
  const nft =
    "0x5c25935a0ff22c00de921ac499ce7d8a8087f6d21f01275a1f51d5c9fcf5f48a";
  const suins =
    "0x300369e8909b9a6464da265b9a5a9ab6fe2158a040e84e808628cde7a07ee5a3";
  const domain = "mywhitelist.sui";

  //   const suiClient = new SuiClient({
  //     url: getFullnodeUrl(env),
  //   });

  //   const devTx = new Transaction();

  //   devTx.moveCall({
  //     target: `@tonymysten/sample::suins_workshop::whitelist_id`,
  //     arguments: [devTx.object(suins), devTx.pure.string(domain)],
  //   });

  //   const whitelistRes = await suiClient.devInspectTransactionBlock({
  //     sender:
  //       "0x5710140c577ed0d6071af1648e9ada06b6894e5c7056360bc8b5992466a1ae6a",
  //     transactionBlock: devTx,
  //   });
  //   const bytes = whitelistRes.results![0].returnValues![0][0];
  //   const
  //   const whitelistId = bcs.ID.parse(new Uint8Array(bytes));

  //   console.log(whitelistId);

  //   const devTx2 = new Transaction();

  //   devTx2.moveCall({
  //     target: `${packageId}::suins_workshop::is_whitelisted`,
  //     arguments: [
  //       devTx2.object(whitelistId),
  //       devTx2.pure.address(whitelistedAddress),
  //     ],
  //   });

  //   const response = await suiClient.devInspectTransactionBlock({
  //     sender:
  //       "0x5710140c577ed0d6071af1648e9ada06b6894e5c7056360bc8b5992466a1ae6a",
  //     transactionBlock: devTx2,
  //   });
  //   const isWhitelisted = bcs.Bool.parse(
  //     new Uint8Array(response.results![0].returnValues![0][0])
  //   );
  //   console.log(`isWhitelisted: ${isWhitelisted}`);

  const tx = new Transaction();
  tx.addSerializationPlugin(testnetPlugin);

  const whitelist = tx.moveCall({
    target: `@tonymysten/sample::suins_workshop::create_whitelist`,
    arguments: [tx.object(suins), tx.object(nft), tx.object.clock()],
  });

  tx.moveCall({
    target: `@tonymysten/sample::suins_workshop::add_whitelist`,
    arguments: [
      tx.object(nft),
      whitelist,
      tx.pure.address(
        "0xa7f326888de0b122c5611a1c3047f03f663933396938b551fd324627db44f6b0"
      ),
    ],
  });

  tx.moveCall({
    target: `@tonymysten/sample::suins_workshop::share`,
    arguments: [whitelist],
  });

  let res = await signAndExecute(tx, env);

  console.dir(res, { depth: null });
})();
