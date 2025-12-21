export const MESSAGE_PAYLOAD_KIND = "ss-message";
export const MESSAGE_PAYLOAD_VERSION = 1;

const cleanString = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const isHttpUrl = (value) => /^https?:\/\//i.test(value);

const normalizeGifMeta = (gif) => {
  if (!gif || typeof gif !== "object") return null;
  const provider = cleanString(gif.provider).toLowerCase();
  const id = cleanString(gif.id);
  const url = cleanString(gif.url);
  if (!provider || !id || !url) return null;

  const previewUrl = cleanString(gif.previewUrl);
  const title = cleanString(gif.title);
  const width = Number.isFinite(gif.width) ? gif.width : null;
  const height = Number.isFinite(gif.height) ? gif.height : null;

  return {
    provider,
    id,
    url,
    previewUrl: previewUrl || undefined,
    title: title || undefined,
    width,
    height,
  };
};

export function buildMessagePayload({ text, attachments }) {
  const safeText = typeof text === "string" ? text : "";
  const safeAttachments = Array.isArray(attachments) ? attachments : [];
  if (safeAttachments.length === 0) return null;

  const normalized = safeAttachments
    .filter(
      (att) =>
        att &&
        ((typeof att.dataUrl === "string" && att.dataUrl.startsWith("data:image/")) ||
          (typeof att.url === "string" && isHttpUrl(att.url)))
    )
    .map((att) => {
      const base = {
        id: att.id || "",
        type: att.type === "gif" ? "gif" : "image",
        name: att.name || "",
        mime: att.mime || "",
        size: Number.isFinite(att.size) ? att.size : 0,
        width: Number.isFinite(att.width) ? att.width : null,
        height: Number.isFinite(att.height) ? att.height : null,
        encrypted: !!att.encrypted,
        fileKey: typeof att.fileKey === "string" ? att.fileKey : undefined,
        iv: typeof att.iv === "string" ? att.iv : undefined,
      };

      if (typeof att.dataUrl === "string" && att.dataUrl.startsWith("data:image/")) {
        base.dataUrl = att.dataUrl;
      }

      if (typeof att.url === "string" && isHttpUrl(att.url)) {
        base.url = att.url;
      }

      if (typeof att.previewUrl === "string" && isHttpUrl(att.previewUrl)) {
        base.previewUrl = att.previewUrl;
      }

      const gifMeta = normalizeGifMeta(att.gif);
      if (gifMeta) base.gif = gifMeta;

      return base;
    });

  if (normalized.length === 0) return null;

  return {
    kind: MESSAGE_PAYLOAD_KIND,
    v: MESSAGE_PAYLOAD_VERSION,
    text: safeText,
    attachments: normalized,
  };
}

export function parseMessagePayload(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  if (!rawText.includes(`"kind":"${MESSAGE_PAYLOAD_KIND}"`)) return null;

  let parsed = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return null;
  }

  if (!parsed || parsed.kind !== MESSAGE_PAYLOAD_KIND || parsed.v !== MESSAGE_PAYLOAD_VERSION) {
    return null;
  }

  if (!Array.isArray(parsed.attachments)) return null;

  const text = typeof parsed.text === "string" ? parsed.text : "";
  const attachments = parsed.attachments
    .filter(
      (att) =>
        att &&
        (att.type === "image" || att.type === "gif") &&
        ((typeof att.dataUrl === "string" && att.dataUrl.startsWith("data:image/")) ||
          (typeof att.url === "string" && isHttpUrl(att.url)))
    )
    .map((att) => {
      const base = {
        id: att.id || "",
        type: att.type === "gif" ? "gif" : "image",
        name: typeof att.name === "string" ? att.name : "",
        mime: typeof att.mime === "string" ? att.mime : "",
        size: Number.isFinite(att.size) ? att.size : 0,
        width: Number.isFinite(att.width) ? att.width : null,
        height: Number.isFinite(att.height) ? att.height : null,
        encrypted: !!att.encrypted,
        fileKey: typeof att.fileKey === "string" ? att.fileKey : undefined,
        iv: typeof att.iv === "string" ? att.iv : undefined,
      };

      if (typeof att.dataUrl === "string" && att.dataUrl.startsWith("data:image/")) {
        base.dataUrl = att.dataUrl;
      }

      if (typeof att.url === "string" && isHttpUrl(att.url)) {
        base.url = att.url;
      }

      if (typeof att.previewUrl === "string" && isHttpUrl(att.previewUrl)) {
        base.previewUrl = att.previewUrl;
      }

      const gifMeta = normalizeGifMeta(att.gif);
      if (gifMeta) base.gif = gifMeta;

      return base;
    });

  return { text, attachments };
}
