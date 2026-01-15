const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { processImageBuffer } = require("../lib/image-processing");
const { db } = require("../db");
const { getPublicUrl, uploadObject, deleteObject } = require("../lib/spaces");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  return res.redirect("/admin/login");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) return cb(null, true);
    const err = new Error("Only image uploads are allowed.");
    err.code = "INVALID_FILE_TYPE";
    return cb(err);
  },
});

function buildKey(extension) {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString("hex");
  return `ryan-daily/gallery/${year}/${month}/${timestamp}-${random}.${extension}`;
}

async function loadGalleryPage(req, res, { error, success, form } = {}) {
  const items = await db.any(
    `SELECT * FROM gallery_images ORDER BY created_at DESC, id DESC`
  );
  res.render("pages/gallery", {
    pageTitle: "Gallery",
    activeTab: "gallery",
    items,
    error,
    success,
    form: form || {},
  });
}

router.get("/", async (req, res) => {
  const error = req.query.error ? String(req.query.error) : null;
  const success = req.query.success ? String(req.query.success) : null;
  await loadGalleryPage(req, res, { error, success });
});

router.post("/upload", requireAdmin, (req, res) => {
  upload.array("images", 12)(req, res, async (err) => {
    if (err) {
      let message = "Upload failed. Please try again.";
      if (err.code === "LIMIT_FILE_SIZE") {
        message = "Image must be 10MB or smaller.";
      } else if (err.code === "INVALID_FILE_TYPE") {
        message = "Only image uploads are allowed.";
      }
      return loadGalleryPage(req, res, {
        error: message,
        form: { title: req.body.title, caption: req.body.caption },
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      return loadGalleryPage(req, res, {
        error: "Please choose an image to upload.",
        form: { title: req.body.title, caption: req.body.caption },
      });
    }

    const title = String(req.body.title || "").trim();
    const caption = String(req.body.caption || "").trim();

    try {
      for (const file of files) {
        const { buffer, width, height, sizeBytes } = await processImageBuffer(
          file
        );

        const key = buildKey("webp");
        const publicUrl = getPublicUrl(key);

        await uploadObject({
          buffer,
          key,
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
        });

        await db.none(
          `INSERT INTO gallery_images
           (title, caption, spaces_key, public_url, mime_type, size_bytes, width, height)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            title || null,
            caption || null,
            key,
            publicUrl,
            file.mimetype || null,
            sizeBytes,
            width,
            height,
          ]
        );
      }

      return res.redirect("/gallery?success=Upload%20complete");
    } catch (uploadErr) {
      console.error("Gallery upload failed:", uploadErr);
      return loadGalleryPage(req, res, {
        error:
          uploadErr.message ||
          "Upload failed. Please try again.",
        form: { title, caption },
      });
    }
  });
});

router.post("/:id/delete", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.redirect("/gallery?error=Invalid%20image");

  const record = await db.oneOrNone(
    `SELECT * FROM gallery_images WHERE id=$1`,
    [id]
  );

  if (!record) return res.redirect("/gallery?error=Image%20not%20found");

  try {
    await deleteObject(record.spaces_key);
    await db.none(`DELETE FROM gallery_images WHERE id=$1`, [id]);
    return res.redirect("/gallery?success=Image%20deleted");
  } catch (err) {
    console.error("Gallery delete failed:", err);
    return res.redirect("/gallery?error=Delete%20failed");
  }
});

module.exports = router;
