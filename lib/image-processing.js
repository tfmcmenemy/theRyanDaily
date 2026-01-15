const sharp = require("sharp");
const heicConvert = require("heic-convert");

function isHeicLike(mimetype) {
  if (!mimetype) return false;
  return mimetype === "image/heic" || mimetype === "image/heif";
}

async function processImageBuffer(file) {
  let sourceBuffer = file.buffer;
  if (isHeicLike(file.mimetype)) {
    sourceBuffer = await heicConvert({
      buffer: file.buffer,
      format: "JPEG",
      quality: 0.9,
    });
  }

  const resized = sharp(sourceBuffer)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true });

  const { data, info } = await resized
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width || null,
    height: info.height || null,
    sizeBytes: data.length,
  };
}

module.exports = {
  processImageBuffer,
};
