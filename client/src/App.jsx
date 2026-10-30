import "./App.css";
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import axios from "axios";

const connection = new Connection("https://api.testnet.solana.com");

const fromPublicKey = new PublicKey(
  "Qvm9udx7WXqZJj8VcUxZuZvw3bY24oyXDdiAMoBCr4C",
);

function App() {
  const sendSol = async () => {
    const ix = SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: new PublicKey("Fns9stN2A6F7irMWMP73z4bsbivng9NPzcKbvxSEjUfb"),
      lamports: 0.01 * LAMPORTS_PER_SOL,
    });

    const tx = new Transaction(ix);

    const { blockhash } = await connection.getLatestBlockhash();

    tx.recentBlockhash = blockhash;
    tx.feePayer = fromPublicKey;

    //Serialize the transaction and send
    const serializedTx = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log(serializedTx);

    await axios.post("/api/v1/txn/sign", { message: serializedTx });
  };

  return (
    <>
      <input type="text" placeholder="Enter Amount " />
      <input type="text" placeholder="Address " />
      <button onClick={sendSol}>Send</button>
    </>
  );
}

export default App;
