const express = require("express");
const connectDB = require("./connectDb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const bs58 = require("bs58").default;
const cors = require("cors");
const { userModel } = require("./models");
const { Keypair, Transaction, Connection } = require("@solana/web3.js");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

//Connect Database
connectDB();

//Create the connection object
const connection = new Connection(
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
);

app.get("/", (req, res) => {
  res.send({ message: "Server is Up" });
});

app.post("/api/v1/signup", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const existingUser = await userModel.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "Username already exists" });
    }

    const keypair = await Keypair.generate();

    const user = await userModel.create({
      username,
      password: await bcrypt.hash(password, 10),
      publicKey: keypair.publicKey.toString(),
      privateKey: bs58.encode(keypair.secretKey),
    });

    res.status(201).json({ publicKey: user.publicKey });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/signin", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await userModel.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    res.json({ token, publicKey: user.publicKey });
  } catch (error) {
    next(error);
  }
});

app.post("/api/v1/txn/sign", async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await userModel.findOne({ username: decoded.username });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const secretKey = bs58.decode(user.privateKey);

    const keypair = Keypair.fromSecretKey(secretKey);

    const serializedTx = req.body.message;
    const tx = Transaction.from(serializedTx);
    await tx.signAsync(keypair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    const confirmation = await connection.confirmTransaction(
      signature,
      "confirmed",
    );

    res.json({ signature: confirmation.value?.signature ?? signature });
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal Server Error" });
});

app.listen(8000, () => {
  console.log(`The Server is running on http://localhost:8000`);
});
