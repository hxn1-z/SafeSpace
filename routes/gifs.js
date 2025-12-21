// routes/gifs.js -- GIF search proxy + favorites

const express = require("express");
const https = require("https");
const { getUserFromRequest } = require("../utils/auth");
const { users, saveUsers } = require("../data/store");

const router = express.Router();

const GIPHY_KEY = process.env.GIPHY_API_KEY || process.env.GIPHY_KEY || "";
const TENOR_KEY = process.env.TENOR_API_KEY || process.env.TENOR_KEY || "";

const MAX_RESULTS = 36;
const MAX_FAVORITES = 200;

const cleanString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normalizeGifRecord = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const provider = cleanString(raw.provider).toLowerCase();
  if (provider !== "giphy" && provider !== "tenor") return null;
  const id = cleanString(raw.id);
  const url = cleanString(raw.url);
  if (!id || !url) return null;
  const previewUrl = cleanString(raw.previewUrl) || url;
  const title = cleanString(raw.title);
  const width = toNumberOrNull(raw.width);
  const height = toNumberOrNull(raw.height);

  return {
    provider,
    id,
    url,
    previewUrl,
    title,
    width,
    height,
  };
};

const fetchJson = async (url) => {
  if (typeof fetch === "function") {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`GIF upstream failed (${res.status})`);
    }
    return res.json();
  }

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`GIF upstream failed (${res.statusCode})`));
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
};

const mapGiphyItem = (item) => {
  const id = cleanString(item?.id);
  const title = cleanString(item?.title);
  const original = item?.images?.original || {};
  const preview =
    item?.images?.fixed_width_small ||
    item?.images?.preview_gif ||
    item?.images?.downsized_small ||
    original;
  const url = cleanString(original?.url);
  if (!id || !url) return null;
  const previewUrl = cleanString(preview?.url) || url;
  const width = toNumberOrNull(original?.width);
  const height = toNumberOrNull(original?.height);

  return {
    provider: "giphy",
    id,
    url,
    previewUrl,
    title,
    width,
    height,
  };
};

const mapTenorItem = (item) => {
  const id = cleanString(item?.id);
  const title = cleanString(item?.title);
  const media = item?.media_formats || {};
  const gif =
    media.gif ||
    media.mediumgif ||
    media.tinygif ||
    media.nanogif ||
    media.mp4 ||
    null;
  if (!gif) return null;
  const url = cleanString(gif.url);
  if (!id || !url) return null;
  const preview =
    media.tinygif || media.nanogif || media.mediumgif || gif;
  const previewUrl = cleanString(preview?.url) || url;
  const dims = gif?.dims || preview?.dims;
  const width = Array.isArray(dims) ? toNumberOrNull(dims[0]) : toNumberOrNull(gif?.width);
  const height = Array.isArray(dims) ? toNumberOrNull(dims[1]) : toNumberOrNull(gif?.height);

  return {
    provider: "tenor",
    id,
    url,
    previewUrl,
    title,
    width,
    height,
  };
};

router.get("/api/gifs/search", async (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const provider = cleanString(req.query.provider || "all").toLowerCase();
  const q = cleanString(req.query.q);
  const limitRaw = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_RESULTS)
    : 24;

  if (!["all", "giphy", "tenor"].includes(provider)) {
    return res.status(400).json({ message: "Invalid provider" });
  }

  if (!GIPHY_KEY && !TENOR_KEY) {
    return res.status(503).json({ message: "GIF search is not configured." });
  }

  if (provider === "giphy" && !GIPHY_KEY) {
    return res.status(503).json({ message: "Giphy is not configured." });
  }

  if (provider === "tenor" && !TENOR_KEY) {
    return res.status(503).json({ message: "Tenor is not configured." });
  }

  const allowGiphy = provider === "all" || provider === "giphy";
  const allowTenor = provider === "all" || provider === "tenor";
  const results = [];

  try {
    const tasks = [];
    const perProvider = provider === "all" ? Math.ceil(limit / 2) : limit;

    if (allowGiphy && GIPHY_KEY) {
      const endpoint = q ? "search" : "trending";
      const params = new URLSearchParams({
        api_key: GIPHY_KEY,
        limit: String(perProvider),
        rating: "pg-13",
      });
      if (q) params.set("q", q);
      const url = `https://api.giphy.com/v1/gifs/${endpoint}?${params.toString()}`;
      tasks.push(
        fetchJson(url).then((data) => {
          const list = Array.isArray(data?.data) ? data.data : [];
          return list.map(mapGiphyItem).filter(Boolean);
        })
      );
    }

    if (allowTenor && TENOR_KEY) {
      const endpoint = q ? "search" : "featured";
      const params = new URLSearchParams({
        key: TENOR_KEY,
        limit: String(perProvider),
        media_filter: "gif,tinygif,mediumgif,nanogif",
        contentfilter: "medium",
      });
      if (q) params.set("q", q);
      const url = `https://tenor.googleapis.com/v2/${endpoint}?${params.toString()}`;
      tasks.push(
        fetchJson(url).then((data) => {
          const list = Array.isArray(data?.results) ? data.results : [];
          return list.map(mapTenorItem).filter(Boolean);
        })
      );
    }

    const [giphyResults = [], tenorResults = []] = await Promise.all(tasks);

    if (provider === "all") {
      const maxLen = Math.max(giphyResults.length, tenorResults.length);
      for (let i = 0; i < maxLen; i += 1) {
        if (giphyResults[i]) results.push(giphyResults[i]);
        if (tenorResults[i]) results.push(tenorResults[i]);
      }
    } else if (provider === "giphy") {
      results.push(...giphyResults);
    } else if (provider === "tenor") {
      results.push(...tenorResults);
    }

    res.json({ results: results.slice(0, limit) });
  } catch (err) {
    res.status(502).json({ message: err.message || "GIF search failed." });
  }
});

router.get("/api/gifs/favorites", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const dbUser = users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ message: "User not found" });

  const list = Array.isArray(dbUser.gifFavorites) ? dbUser.gifFavorites : [];
  res.json(list);
});

router.post("/api/gifs/favorites", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const dbUser = users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ message: "User not found" });

  const { gif } = req.body || {};
  const normalized = normalizeGifRecord(gif);
  if (!normalized) {
    return res.status(400).json({ message: "Invalid GIF payload" });
  }

  const existing = Array.isArray(dbUser.gifFavorites) ? dbUser.gifFavorites : [];
  const key = `${normalized.provider}:${normalized.id}`;
  if (existing.some((item) => `${item.provider}:${item.id}` === key)) {
    return res.json({ favorites: existing });
  }

  const entry = { ...normalized, addedAt: new Date().toISOString() };
  const updated = [entry, ...existing].slice(0, MAX_FAVORITES);
  dbUser.gifFavorites = updated;
  saveUsers();

  res.json({ favorites: updated });
});

router.delete("/api/gifs/favorites/:provider/:id", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const dbUser = users.find((u) => u.id === user.id);
  if (!dbUser) return res.status(404).json({ message: "User not found" });

  const provider = cleanString(req.params.provider).toLowerCase();
  const id = cleanString(req.params.id);
  if (!provider || !id) {
    return res.status(400).json({ message: "Invalid GIF identifier" });
  }

  const existing = Array.isArray(dbUser.gifFavorites) ? dbUser.gifFavorites : [];
  const updated = existing.filter(
    (item) => !(item.provider === provider && item.id === id)
  );
  dbUser.gifFavorites = updated;
  saveUsers();

  res.json({ favorites: updated });
});

module.exports = router;
