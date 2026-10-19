import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { getStore } from "@netlify/blobs";

const STORE_NAME = "selfie-booth-shares";
const DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_SHARE_BYTES = 32 * 1024 * 1024;
const MAX_CREATES_PER_HOUR = 20;
const SHARE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHOTO_NAME = /^photo-[1-8]\.jpg$/;
const VIDEO_NAME = /^live-[1-8]\.(webm|mp4)$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function response(status, body, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });
}

function json(status, value) {
  return response(status, JSON.stringify(value), {
    "Content-Type": "application/json; charset=utf-8",
  });
}

function secretMatches(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

function getShareId(pathname) {
  const match = pathname.match(
    /\/shares(?:\/([^/]+))?(?:\/files\/([^/]+))?\/?$/,
  );
  if (!match) return null;
  return {
    id: match[1] ? decodeURIComponent(match[1]) : null,
    fileName: match[2] ? decodeURIComponent(match[2]) : null,
  };
}

function getMetadataKey(id) {
  return `share/${id}`;
}

function getFileKey(id, name) {
  return `file/${id}/${name}`;
}

async function readShare(store, id) {
  if (!SHARE_ID.test(id)) return null;
  const metadata = await store.get(getMetadataKey(id), {
    type: "json",
    consistency: "strong",
  });
  if (!metadata) return null;
  if (metadata.expiresAt <= Date.now()) {
    await deleteShareBlobs(store, id, metadata);
    return null;
  }
  return metadata;
}

async function deleteShareBlobs(store, id, metadata) {
  await Promise.all(
    Object.keys(metadata.files || {}).map((name) =>
      store.delete(getFileKey(id, name)),
    ),
  );
  await store.delete(getMetadataKey(id));
}

async function checkRateLimit(store, ip) {
  const now = Date.now();
  const key = `rate/${createHash("sha256")
    .update(ip || "unknown")
    .digest("hex")}`;
  const current = await store.get(key, { type: "json", consistency: "strong" });
  const limit =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + 60 * 60 * 1000 }
      : current;
  limit.count++;
  await store.setJSON(key, limit);
  if (limit.count > MAX_CREATES_PER_HOUR) {
    throw new HttpError(
      429,
      "Too many share links were created. Try again later.",
    );
  }
}

async function createShare(store, context) {
  await checkRateLimit(store, context.ip);
  const id = randomUUID();
  const uploadKey = randomBytes(32).toString("base64url");
  const configuredRetention = Number(
    process.env.SHARE_TTL_MS || DEFAULT_RETENTION_MS,
  );
  if (!Number.isSafeInteger(configuredRetention) || configuredRetention <= 0) {
    throw new HttpError(500, "Share retention is not configured correctly.");
  }
  const metadata = {
    id,
    uploadKey,
    createdAt: Date.now(),
    expiresAt: Date.now() + configuredRetention,
    files: {},
  };
  const result = await store.setJSON(getMetadataKey(id), metadata, {
    onlyIfNew: true,
  });
  if (!result.modified)
    throw new HttpError(503, "Could not create a unique share link.");
  return json(201, { id, uploadKey, expiresAt: metadata.expiresAt });
}

async function uploadFile(request, store, id, name) {
  const metadata = await readShare(store, id);
  if (!metadata)
    throw new HttpError(404, "This share link has expired or does not exist.");
  if (!secretMatches(request.headers.get("x-upload-key"), metadata.uploadKey)) {
    throw new HttpError(403, "Upload authorization failed.");
  }
  const isPhoto = PHOTO_NAME.test(name);
  const isVideo = VIDEO_NAME.test(name);
  if (!isPhoto && !isVideo) throw new HttpError(400, "Unsupported file name.");

  const contentType = (request.headers.get("content-type") || "")
    .split(";")[0]
    .toLowerCase();
  if (
    (isPhoto && contentType !== "image/jpeg") ||
    (isVideo && !["video/webm", "video/mp4"].includes(contentType))
  ) {
    throw new HttpError(415, "Unsupported file type.");
  }
  if (metadata.files[name])
    throw new HttpError(409, "This file has already been uploaded.");

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_BYTES)
    throw new HttpError(413, "This file is too large to share.");
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0)
    throw new HttpError(400, "The uploaded file is empty.");
  if (bytes.byteLength > MAX_FILE_BYTES)
    throw new HttpError(413, "This file is too large to share.");

  const usedBytes = Object.values(metadata.files).reduce(
    (total, file) => total + file.size,
    0,
  );
  if (usedBytes + bytes.byteLength > MAX_SHARE_BYTES) {
    throw new HttpError(413, "The share has reached its storage limit.");
  }

  const stored = await store.set(getFileKey(id, name), bytes, {
    onlyIfNew: true,
    metadata: { contentType },
  });
  if (!stored.modified)
    throw new HttpError(409, "This file has already been uploaded.");
  metadata.files[name] = { name, contentType, size: bytes.byteLength };
  await store.setJSON(getMetadataKey(id), metadata);
  return json(201, { name, size: bytes.byteLength });
}

async function getShare(store, id) {
  const metadata = await readShare(store, id);
  if (!metadata)
    throw new HttpError(404, "This share link has expired or does not exist.");
  return json(200, {
    id,
    expiresAt: metadata.expiresAt,
    files: Object.values(metadata.files).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  });
}

async function removeShare(request, store, id) {
  const metadata = await readShare(store, id);
  if (!metadata)
    throw new HttpError(404, "This share link has expired or does not exist.");
  if (!secretMatches(request.headers.get("x-upload-key"), metadata.uploadKey)) {
    throw new HttpError(403, "Share deletion authorization failed.");
  }
  await deleteShareBlobs(store, id, metadata);
  return response(204, null);
}

async function downloadFile(store, id, name) {
  const metadata = await readShare(store, id);
  const file = metadata?.files?.[name];
  if (
    !metadata ||
    !file ||
    (!PHOTO_NAME.test(name) && !VIDEO_NAME.test(name))
  ) {
    throw new HttpError(404, "This file has expired or does not exist.");
  }
  const bytes = await store.get(getFileKey(id, name), {
    type: "arrayBuffer",
    consistency: "strong",
  });
  return response(200, bytes, {
    "Content-Type": file.contentType,
    "Content-Length": String(file.size),
    "Content-Disposition": `attachment; filename="${name}"`,
  });
}

export function createHandler(getStoreFn = getStore) {
  return async (request, context) => {
    try {
      const store = getStoreFn(STORE_NAME, { consistency: "strong" });
      const route = getShareId(new URL(request.url).pathname);
      if (!route) throw new HttpError(404, "API endpoint not found.");

      if (!route.id && request.method === "POST")
        return await createShare(store, context);
      if (!route.id) throw new HttpError(404, "API endpoint not found.");
      if (route.fileName && request.method === "PUT")
        return await uploadFile(request, store, route.id, route.fileName);
      if (route.fileName && request.method === "GET")
        return await downloadFile(store, route.id, route.fileName);
      if (!route.fileName && request.method === "GET")
        return await getShare(store, route.id);
      if (!route.fileName && request.method === "DELETE")
        return await removeShare(request, store, route.id);
      throw new HttpError(405, "Method not allowed.");
    } catch (error) {
      if (error instanceof HttpError)
        return json(error.status, { error: error.message });
      console.error("Share function failed:", error);
      return json(500, { error: "The request could not be completed." });
    }
  };
}

export default createHandler();
