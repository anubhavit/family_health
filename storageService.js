// src/services/storageService.js
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  // Uncomment for Cloudflare R2:
  // endpoint: process.env.AWS_ENDPOINT,
});

const BUCKET = process.env.AWS_BUCKET_NAME;
const ENCRYPTION_KEY = Buffer.from(process.env.FILE_ENCRYPTION_KEY || '0'.repeat(64), 'hex');

// ─── CLIENT-SIDE ENCRYPTION BEFORE UPLOAD ────────────────────
function encryptFile(inputPath) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const input = fs.readFileSync(inputPath);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  // Prepend IV to encrypted data
  return Buffer.concat([iv, encrypted]);
}

function decryptBuffer(encryptedBuffer) {
  const iv = encryptedBuffer.slice(0, 16);
  const data = encryptedBuffer.slice(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

// ─── GENERATE STORAGE KEY ─────────────────────────────────────
function generateFileKey(userId, memberId, filename) {
  const ext = path.extname(filename);
  const randomId = crypto.randomUUID();
  const timestamp = Date.now();
  // Opaque key — does not reveal PII
  return `${process.env.AWS_BUCKET_PREFIX || 'reports/'}${userId}/${memberId}/${timestamp}-${randomId}${ext}`;
}

// ─── FILE HASH FOR INTEGRITY ──────────────────────────────────
function computeFileHash(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

// ─── UPLOAD REPORT ────────────────────────────────────────────
async function uploadReport(filePath, userId, memberId, originalName, mimeType) {
  const fileKey = generateFileKey(userId, memberId, originalName);
  const fileHash = computeFileHash(filePath);

  // Encrypt before upload
  const encryptedData = encryptFile(filePath);

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    Body: encryptedData,
    ContentType: 'application/octet-stream', // Hide original mime type
    ServerSideEncryption: 'AES256',           // S3-side encryption too
    Metadata: {
      'x-original-mime': mimeType,
      'x-file-hash': fileHash,
      'x-user-id': userId,
      'x-member-id': memberId,
    },
    // No public access
    ACL: undefined,
  }));

  logger.info('Report uploaded to storage', { fileKey, userId });

  return { fileKey, fileHash, fileSizeBytes: encryptedData.length };
}

// ─── GET PRESIGNED DOWNLOAD URL (15 min expiry) ───────────────
async function getDownloadUrl(fileKey) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });

  // Presigned URL expires in 15 minutes
  const url = await getSignedUrl(s3, command, { expiresIn: 900 });
  return url;
}

// ─── DOWNLOAD AND DECRYPT FOR PROCESSING ─────────────────────
async function downloadAndDecrypt(fileKey, destPath) {
  const response = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  }));

  const chunks = [];
  for await (const chunk of response.Body) chunks.push(chunk);
  const encryptedBuffer = Buffer.concat(chunks);

  const decrypted = decryptBuffer(encryptedBuffer);
  fs.writeFileSync(destPath, decrypted);
  return destPath;
}

// ─── DELETE FILE ──────────────────────────────────────────────
async function deleteFile(fileKey) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: fileKey }));
  logger.info('Report deleted from storage', { fileKey });
}

module.exports = { uploadReport, getDownloadUrl, downloadAndDecrypt, deleteFile, computeFileHash };
