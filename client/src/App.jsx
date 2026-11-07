import "./App.css";
import {
  Transaction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function isTokenValid(token) {
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.testnet.solana.com",
);

// const fromPublicKey = new PublicKey(
//   "Qvm9udx7WXqZJj8VcUxZuZvw3bY24oyXDdiAMoBCr4C",
// );

axios.defaults.baseURL = "http://localhost:8000"; // Set the base URL for axios requests

function App() {
  const navigate = useNavigate();

  const [isSignedIn, setIsSignedIn] = useState(() =>
    isTokenValid(localStorage.getItem("token")),
  );

  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");

      setBalance(localStorage.getItem("balance"));
      if (!isTokenValid(token)) {
        if (token) {
          localStorage.removeItem("token");
          localStorage.removeItem("publicKey");
          localStorage.removeItem("balance");
        }
        setIsSignedIn(false);
      } else {
        setIsSignedIn(true);
      }
    };
    syncAuth();
    window.addEventListener("focus", syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("focus", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("token");
    localStorage.removeItem("balance");
    setIsSignedIn(false);
    navigate("/signin", { replace: true });
  };

  const sendSol = async () => {
    const publicKey = new PublicKey(localStorage.getItem("publicKey"));

    const ix = SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: new PublicKey(document.getElementById("address").value),
      lamports: document.getElementById("amount").value * LAMPORTS_PER_SOL,
    });

    const tx = new Transaction(ix);

    const { blockhash } = await connection.getLatestBlockhash();

    tx.recentBlockhash = blockhash;
    tx.feePayer = publicKey;

    //Serialize the transaction and send
    const serializedTx = await tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log(serializedTx);

    const token = localStorage.getItem("token");

    if (!isTokenValid(token)) {
      handleSignOut();
      return;
    }

    try {
      await axios.post(
        "/api/v1/txn/sign",
        { message: serializedTx },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (err) {
      if (err.response?.status === 401) {
        handleSignOut();
      }
      throw err;
    }
  };

  return (
    <>
      <div className="wallet-container">
        <nav className="navbar">
          <h1 className="logo">
            SOL<span>PAY</span>
          </h1>

          {isSignedIn ? (
            <button className="auth-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          ) : (
            <button className="auth-btn" onClick={() => navigate("/signin")}>
              Sign In
            </button>
          )}
        </nav>

        <main className="wallet-main">
          <div className="wallet-card">
            <p className="subtitle">Solana Wallet</p>
            <div className="hero">
              <h2>Send SOL</h2>{" "}
              <div className="balance">
                <span className="balance-text">SOL : </span> <h1>{balance}</h1>
              </div>
            </div>
            <p className="description">
              Transfer SOL securely to any Solana address.
            </p>
            <div className="form-group">
              <label>Amount (SOL)</label>
              <input type="number" placeholder="0.00" id="amount" />
            </div>
            <div className="form-group">
              <label>Recipient Address</label>
              <input
                type="text"
                placeholder="Enter Solana wallet address"
                id="address"
              />
            </div>
            <button
              className="send-btn"
              onClick={sendSol}
              // disabled={!isSignedIn}
            >
              Send SOL →
            </button>
            {!isSignedIn && (
              <p className="auth-message">Sign in to enable transactions.</p>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default App;
