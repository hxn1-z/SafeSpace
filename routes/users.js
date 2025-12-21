// routes/users.js — list users (no emails exposed) + E2EE public keys + encrypted key bundle backup (ciphertext-only)

const express = require("express");
const { users, saveUsers } = require("../data/store");
const { getUserFromRequest } = require("../utils/auth");

const router = express.Router();

// List all VERIFIED users (basic info, username only)
router.get("/api/users", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  res.json(
    users
      .filter((u) => u && u.verified === true)
      .map((u) => ({
        id: u.id,
        username: u.username || "",
      }))
  );
});

// ------------------------------------------------------
//   E2EE KEY BUNDLE (ciphertext-only backup)
//   - Client encrypts their own keypair using a password-derived key (PBKDF2 / AES-GCM)
//   - Server stores ONLY the encrypted bundle; server cannot decrypt it
// ------------------------------------------------------

// Get current user's encrypted key bundle (if exists)
router.get("/api/users/me/key-bundle", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const dbUser = users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ message: "User not found" });

  const bundles = Array.isArray(dbUser.keyBundles)
    ? dbUser.keyBundles.filter(Boolean)
    : [];

  if (bundles.length > 0) {
    const latest = dbUser.keyBundle || bundles[bundles.length - 1] || bundles[0];
    return res.json({ bundles, bundle: latest });
  }

  if (!dbUser.keyBundle) {
    return res.status(404).json({ message: "No key bundle on server" });
  }

  return res.json({ bundles: [dbUser.keyBundle], bundle: dbUser.keyBundle });
});

// Store/overwrite current user's encrypted key bundle
router.post("/api/users/me/key-bundle", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const dbUser = users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ message: "User not found" });

  const { bundle } = req.body || {};
  if (!bundle || typeof bundle !== "object") {
    return res.status(400).json({ message: "bundle object required" });
  }

  // Basic validation to avoid garbage/huge payloads
  const {
    v,
    kdf,
    hash,
    iterations,
    salt,
    iv,
    ciphertext,
  } = bundle;

  if (v !== 1) return res.status(400).json({ message: "Unsupported bundle version" });
  if (kdf !== "PBKDF2") return res.status(400).json({ message: "Unsupported kdf" });
  if (hash !== "SHA-256") return res.status(400).json({ message: "Unsupported hash" });

  if (
    typeof iterations !== "number" ||
    !Number.isFinite(iterations) ||
    iterations < 100000
  ) {
    return res.status(400).json({ message: "Invalid iterations" });
  }

  if (
    typeof salt !== "string" ||
    typeof iv !== "string" ||
    typeof ciphertext !== "string" ||
    salt.length < 16 ||
    iv.length < 8 ||
    ciphertext.length < 16
  ) {
    return res.status(400).json({ message: "Invalid bundle fields" });
  }

  // Prevent oversized bundle abuse
  if (ciphertext.length > 25000) {
    return res.status(400).json({ message: "Bundle too large" });
  }

  const existing = Array.isArray(dbUser.keyBundles)
    ? dbUser.keyBundles.filter(Boolean)
    : [];

  const isDuplicate = existing.some(
    (b) =>
      b &&
      b.ciphertext === bundle.ciphertext &&
      b.iv === bundle.iv &&
      b.salt === bundle.salt &&
      b.iterations === bundle.iterations
  );

  const nextBundles = isDuplicate ? existing : [...existing, bundle];
  dbUser.keyBundles = nextBundles;
  dbUser.keyBundle = bundle;
  saveUsers();

  return res.json({ success: true, total: nextBundles.length });
});

// Store or update the current user's E2EE public key (JWK)
router.post("/api/users/keys", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const { publicKey } = req.body || {};
  if (!publicKey) {
    return res.status(400).json({ message: "publicKey required" });
  }

  const dbUser = users.find((u) => u.id === user.id);
  if (!dbUser) {
    return res.status(404).json({ message: "User not found" });
  }

  dbUser.publicKey = publicKey;
  saveUsers();

  res.json({ success: true });
});

// Get a user's E2EE public key (for DM key derivation)
router.get("/api/users/:id/public-key", (req, res) => {
  const authUser = getUserFromRequest(req);
  if (!authUser) return res.status(401).json({ message: "Unauthorized" });

  const targetId = req.params.id;
  const target = users.find((u) => u.id === targetId);
  if (!target) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    publicKey: target.publicKey || null,
  });
});

module.exports = router;
