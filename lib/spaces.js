const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const {
  DO_SPACES_KEY,
  DO_SPACES_SECRET,
  DO_SPACES_REGION,
  DO_SPACES_BUCKET,
  DO_SPACES_ENDPOINT,
  DO_SPACES_CDN_BASE_URL,
} = process.env;

const spacesClient = new S3Client({
  region: DO_SPACES_REGION,
  endpoint: DO_SPACES_ENDPOINT,
  credentials: {
    accessKeyId: DO_SPACES_KEY,
    secretAccessKey: DO_SPACES_SECRET,
  },
});

function normalizeBaseUrl(url) {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function getPublicUrl(key) {
  const base = normalizeBaseUrl(DO_SPACES_CDN_BASE_URL);
  if (base) return `${base}/${key}`;
  const fallback = `https://${DO_SPACES_BUCKET}.${DO_SPACES_REGION}.digitaloceanspaces.com`;
  return `${fallback}/${key}`;
}

async function uploadObject({ buffer, key, contentType, cacheControl }) {
  const command = new PutObjectCommand({
    Bucket: DO_SPACES_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: cacheControl,
    ACL: "public-read",
  });
  return spacesClient.send(command);
}

async function deleteObject(key) {
  const command = new DeleteObjectCommand({
    Bucket: DO_SPACES_BUCKET,
    Key: key,
  });
  return spacesClient.send(command);
}

module.exports = {
  getPublicUrl,
  uploadObject,
  deleteObject,
};
