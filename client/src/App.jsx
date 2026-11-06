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

const connection = new Connection("https://api.testnet.solana.com");

const fromPublicKey = new PublicKey(
  "Qvm9udx7WXqZJj8VcUxZuZvw3bY24oyXDdiAMoBCr4C",
);

axios.defaults.baseURL = "http://localhost:8000"; // Set the base URL for axios requests
function App() {
  const navigate = useNavigate();

  const [isSignedIn, setIsSignedIn] = useState(() =>
    isTokenValid(localStorage.getItem("token")),
  );

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      if (!isTokenValid(token)) {
        if (token) localStorage.removeItem("token");
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
    setIsSignedIn(false);
    navigate("/signin", { replace: true });
  };

  const sendSol = async () => {
    const ix = SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: new PublicKey(document.getElementById("address").value),
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
            <h2>Send SOL</h2>
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
