const GIF_PROVIDERS = ["giphy", "tenor"];

const cleanString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

export function gifKey(gif) {
  if (!gif || !gif.provider || !gif.id) return "";
  return `${gif.provider}:${gif.id}`;
}

export function normalizeGifRecord(raw) {
  if (!raw || typeof raw !== "object") return null;
  const provider = cleanString(raw.provider).toLowerCase();
  const id = cleanString(raw.id);
  const url = cleanString(raw.url);
  if (!GIF_PROVIDERS.includes(provider) || !id || !url) return null;

  const previewUrl = cleanString(raw.previewUrl) || url;
  const title = cleanString(raw.title);
  const width = Number.isFinite(raw.width) ? raw.width : null;
  const height = Number.isFinite(raw.height) ? raw.height : null;

  return {
    provider,
    id,
    url,
    previewUrl,
    title,
    width,
    height,
  };
}

export function extractSingleUrl(text) {
  const trimmed = cleanString(text);
  if (!trimmed) return "";
  if (!/^https?:\/\/\S+$/i.test(trimmed)) return "";
  return trimmed;
}

export function parseGifUrl(rawUrl) {
  const url = cleanString(rawUrl);
  if (!url) return null;

  let parsed = null;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const path = parsed.pathname || "";
  const parts = path.split("/").filter(Boolean);
  let provider = null;
  let id = "";

  if (host.includes("giphy.com")) {
    provider = "giphy";
    if (parts[0] === "media" && parts[1]) {
      id = parts[1];
    } else if (parts[0] === "gifs" && parts[1]) {
      const slug = parts[1];
      const slugParts = slug.split("-");
      id = slugParts[slugParts.length - 1] || slug;
    }
  } else if (host.includes("tenor.com")) {
    provider = "tenor";
    if ((host.startsWith("media.") || host.startsWith("c.")) && parts[0]) {
      id = parts[0];
    } else if (parts[0] === "view" && parts[1]) {
      const slug = parts[1];
      const slugParts = slug.split("-");
      id = slugParts[slugParts.length - 1] || slug;
    }
  }

  if (!provider || !id) return null;

  const isGif = path.toLowerCase().includes(".gif");
  const normalizedUrl =
    provider === "giphy" && !isGif
      ? `https://media.giphy.com/media/${id}/giphy.gif`
      : url;

  return {
    provider,
    id,
    url: normalizedUrl,
    previewUrl: normalizedUrl,
    originalUrl: url,
  };
}

export function getGifFromMessageText(text) {
  const url = extractSingleUrl(text);
  if (!url) return null;
  return parseGifUrl(url);
}

export function isGifAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") return false;
  if (attachment.gif) return true;
  const mime = cleanString(attachment.mime).toLowerCase();
  if (mime.includes("gif")) return true;
  if (attachment.url) return Boolean(parseGifUrl(attachment.url));
  return false;
}

export function getGifFromPayload(payload) {
  if (!payload || !Array.isArray(payload.attachments)) return null;

  for (const attachment of payload.attachments) {
    if (!attachment) continue;
    const meta = normalizeGifRecord(attachment.gif);
    if (meta) {
      return { ...meta, source: "attachment" };
    }
    if (attachment.url) {
      const parsed = parseGifUrl(attachment.url);
      if (parsed) return { ...parsed, source: "attachment" };
    }
  }

  return null;
}

export { GIF_PROVIDERS };
