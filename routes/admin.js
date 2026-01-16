const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const multer = require("multer");
const router = express.Router();
const { db } = require("../db");
const { uploadObject, getPublicUrl } = require("../lib/spaces");
const { processImageBuffer } = require("../lib/image-processing");

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

function buildUpdateKey(extension) {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString("hex");
  return `ryan-daily/updates/${year}/${month}/${timestamp}-${random}.${extension}`;
}

function mapUploadError(err) {
  if (!err) return null;
  if (err.code === "LIMIT_FILE_SIZE") return "Each image must be 10MB or smaller.";
  if (err.code === "INVALID_FILE_TYPE") return "Only image uploads are allowed.";
  return "Upload failed. Please try again.";
}

router.get("/login", (req, res) => {
  res.render("admin/login", { pageTitle: "Admin Login", activeTab: "" });
});

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");

  const allowedEmail = String(process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const plain = process.env.ADMIN_PASSWORD;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  const emailOk = allowedEmail && email === allowedEmail;

  let passOk = false;
  if (hash) passOk = await bcrypt.compare(password, hash);
  else if (plain) passOk = password === plain;

  if (!emailOk || !passOk) {
    return res.status(401).render("admin/login", {
      pageTitle: "Admin Login",
      activeTab: "",
      error: "Invalid credentials.",
    });
  }

  req.session.isAdmin = true;
  res.redirect("/admin");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/updates"));
});

router.get("/", requireAdmin, async (req, res) => {
  const updates = await db.any(
    `SELECT * FROM updates ORDER BY created_at DESC LIMIT 25`
  );
  const pending = await db.any(
    `SELECT q.*, u.title AS update_title
     FROM questions q
     JOIN updates u ON u.id=q.update_id
     WHERE q.answer IS NULL
     ORDER BY q.asked_at DESC
     LIMIT 50`
  );

  res.render("admin/dashboard", {
    pageTitle: "Admin",
    activeTab: "",
    updates,
    pending,
  });
});

router.get("/analytics", requireAdmin, async (req, res) => {
  const last24 = await db.one(
    `SELECT COUNT(*)::int AS count
     FROM page_views
     WHERE created_at >= NOW() - INTERVAL '24 hours'`
  );
  const last7 = await db.one(
    `SELECT COUNT(*)::int AS count
     FROM page_views
     WHERE created_at >= NOW() - INTERVAL '7 days'`
  );
  const topPaths = await db.any(
    `SELECT path, COUNT(*)::int AS views
     FROM page_views
     WHERE created_at >= NOW() - INTERVAL '7 days'
     GROUP BY path
     ORDER BY views DESC, path ASC
     LIMIT 10`
  );
  const topRegions = await db.any(
    `SELECT COALESCE(NULLIF(region, ''), 'Unknown') AS region, COUNT(*)::int AS views
     FROM page_views
     WHERE created_at >= NOW() - INTERVAL '7 days'
     GROUP BY region
     ORDER BY views DESC, region ASC
     LIMIT 10`
  );

  res.render("admin/analytics", {
    pageTitle: "Analytics",
    activeTab: "",
    last24: last24.count,
    last7: last7.count,
    topPaths,
    topRegions,
  });
});

router.get("/updates/new", requireAdmin, (req, res) => {
  res.render("updates/new", {
    pageTitle: "New Update",
    activeTab: "",
    form: {},
  });
});

router.post("/updates", requireAdmin, (req, res) => {
  upload.array("images", 12)(req, res, async (err) => {
    const uploadError = mapUploadError(err);
    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || "").trim();

    if (uploadError) {
      return res.status(400).render("updates/new", {
        pageTitle: "New Update",
        activeTab: "",
        error: uploadError,
        form: { title, body },
      });
    }

    if (!title || !body) {
      return res.status(400).render("updates/new", {
        pageTitle: "New Update",
        activeTab: "",
        error: "Title and update text are required.",
        form: { title, body },
      });
    }

    const created = await db.one(
      `INSERT INTO updates(title, body) VALUES($1,$2) RETURNING id`,
      [title, body]
    );

    try {
      const files = Array.isArray(req.files) ? req.files : [];
      for (const file of files) {
        const { buffer, width, height, sizeBytes } = await processImageBuffer(
          file
        );
        const key = buildUpdateKey("webp");
        const publicUrl = getPublicUrl(key);

        await uploadObject({
          buffer,
          key,
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
        });

        await db.none(
          `INSERT INTO update_images
           (update_id, spaces_key, public_url, mime_type, size_bytes, width, height)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            created.id,
            key,
            publicUrl,
            file.mimetype || null,
            sizeBytes,
            width,
            height,
          ]
        );
      }
    } catch (uploadErr) {
      console.error("Update image upload failed:", uploadErr);
      return res.redirect(`/updates/${created.id}?error=Image%20upload%20failed`);
    }

    return res.redirect(`/updates/${created.id}`);
  });
});

router.post("/questions/:id/answer", requireAdmin, async (req, res) => {
  const qid = Number(req.params.id);
  const answer = String(req.body.answer || "").trim();

  if (!answer) return res.redirect("/admin");

  await db.none(
    `UPDATE questions
     SET answer=$1, answered_at=NOW()
     WHERE id=$2`,
    [answer, qid]
  );

  res.redirect("/admin");
});

// --- Support editor ---
router.get("/support", requireAdmin, async (req, res) => {
  const items = await db.any(
    `SELECT * FROM support_items
     ORDER BY sort_order ASC, created_at DESC`
  );

  res.render("admin/support_index", {
    pageTitle: "Edit Support",
    activeTab: "",
    items,
  });
});

router.get("/support/new", requireAdmin, (req, res) => {
  res.render("admin/support_form", {
    pageTitle: "New Support Item",
    activeTab: "",
    form: {
      title: "",
      description: "",
      url: "",
      sort_order: 0,
      is_active: true,
    },
    mode: "new",
  });
});

router.post("/support", requireAdmin, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim() || null;
  const url = String(req.body.url || "").trim() || null;
  const sort_order = Number(req.body.sort_order || 0);
  const is_active = req.body.is_active === "on";

  if (!title) {
    return res.status(400).render("admin/support_form", {
      pageTitle: "New Support Item",
      activeTab: "",
      error: "Title is required.",
      form: { title, description, url, sort_order, is_active },
      mode: "new",
    });
  }

  await db.none(
    `INSERT INTO support_items(title, description, url, sort_order, is_active)
     VALUES($1,$2,$3,$4,$5)`,
    [
      title,
      description,
      url,
      Number.isFinite(sort_order) ? sort_order : 0,
      is_active,
    ]
  );

  res.redirect("/admin/support");
});

router.get("/support/:id/edit", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const item = await db.oneOrNone(`SELECT * FROM support_items WHERE id=$1`, [
    id,
  ]);
  if (!item) return res.redirect("/admin/support");

  res.render("admin/support_form", {
    pageTitle: "Edit Support Item",
    activeTab: "",
    form: item,
    mode: "edit",
  });
});

router.post("/support/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim() || null;
  const url = String(req.body.url || "").trim() || null;
  const sort_order = Number(req.body.sort_order || 0);
  const is_active = req.body.is_active === "on";

  if (!title) {
    return res.status(400).render("admin/support_form", {
      pageTitle: "Edit Support Item",
      activeTab: "",
      error: "Title is required.",
      form: { id, title, description, url, sort_order, is_active },
      mode: "edit",
    });
  }

  await db.none(
    `UPDATE support_items
     SET title=$1, description=$2, url=$3, sort_order=$4, is_active=$5
     WHERE id=$6`,
    [
      title,
      description,
      url,
      Number.isFinite(sort_order) ? sort_order : 0,
      is_active,
      id,
    ]
  );

  res.redirect("/admin/support");
});

router.post("/support/:id/delete", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.none(`DELETE FROM support_items WHERE id=$1`, [id]);
  res.redirect("/admin/support");
});
// ---- Update editor ----
router.get("/updates/:id/edit", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const update = await db.oneOrNone(`SELECT * FROM updates WHERE id=$1`, [id]);
  if (!update) return res.redirect("/admin");

  res.render("admin/update_form", {
    pageTitle: "Edit Update",
    activeTab: "",
    mode: "edit",
    form: update,
  });
});

router.post("/updates/:id", requireAdmin, (req, res) => {
  upload.array("images", 12)(req, res, async (err) => {
    const id = Number(req.params.id);
    const title = String(req.body.title || "").trim();
    const body = String(req.body.body || "").trim();
    const uploadError = mapUploadError(err);

    if (!title || !body || uploadError) {
      return res.status(400).render("admin/update_form", {
        pageTitle: "Edit Update",
        activeTab: "",
        mode: "edit",
        error: uploadError || "Title and update text are required.",
        form: { id, title, body },
      });
    }

    await db.none(`UPDATE updates SET title=$1, body=$2 WHERE id=$3`, [
      title,
      body,
      id,
    ]);

    try {
      const files = Array.isArray(req.files) ? req.files : [];
      for (const file of files) {
        const { buffer, width, height, sizeBytes } = await processImageBuffer(
          file
        );
        const key = buildUpdateKey("webp");
        const publicUrl = getPublicUrl(key);

        await uploadObject({
          buffer,
          key,
          contentType: "image/webp",
          cacheControl: "public, max-age=31536000, immutable",
        });

        await db.none(
          `INSERT INTO update_images
           (update_id, spaces_key, public_url, mime_type, size_bytes, width, height)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            id,
            key,
            publicUrl,
            file.mimetype || null,
            sizeBytes,
            width,
            height,
          ]
        );
      }
    } catch (uploadErr) {
      console.error("Update image upload failed:", uploadErr);
      return res.redirect(`/updates/${id}?error=Image%20upload%20failed`);
    }

    return res.redirect(`/updates/${id}`);
  });
});

router.post("/updates/:id/delete", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.none(`DELETE FROM updates WHERE id=$1`, [id]); // cascades questions
  res.redirect("/admin");
});

// ---- Question editor ----
router.get("/questions/:id/edit", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const q = await db.oneOrNone(
    `SELECT q.*, u.title AS update_title
     FROM questions q
     JOIN updates u ON u.id = q.update_id
     WHERE q.id=$1`,
    [id]
  );
  if (!q) return res.redirect("/admin");

  res.render("admin/question_form", {
    pageTitle: "Edit Question",
    activeTab: "",
    form: q,
  });
});

router.post("/questions/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const question = String(req.body.question || "").trim();
  const answer = String(req.body.answer || "").trim();

  if (!question) {
    const q = await db.oneOrNone(
      `SELECT q.*, u.title AS update_title
       FROM questions q
       JOIN updates u ON u.id = q.update_id
       WHERE q.id=$1`,
      [id]
    );

    return res.status(400).render("admin/question_form", {
      pageTitle: "Edit Question",
      activeTab: "",
      error: "Question text cannot be empty.",
      form: q || { id, question, answer },
    });
  }

  // If answer is blank, clear it and answered_at
  if (!answer) {
    await db.none(
      `UPDATE questions
       SET question=$1, answer=NULL, answered_at=NULL
       WHERE id=$2`,
      [question, id]
    );
  } else {
    await db.none(
      `UPDATE questions
       SET question=$1, answer=$2, answered_at=COALESCE(answered_at, NOW())
       WHERE id=$3`,
      [question, answer, id]
    );
  }

  // Redirect back to the update
  const row = await db.one(`SELECT update_id FROM questions WHERE id=$1`, [id]);
  res.redirect(`/updates/${row.update_id}#questions`);
});

router.post("/questions/:id/delete", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.oneOrNone(
    `SELECT update_id FROM questions WHERE id=$1`,
    [id]
  );
  if (row) {
    await db.none(`DELETE FROM questions WHERE id=$1`, [id]);
    return res.redirect(`/updates/${row.update_id}#questions`);
  }
  res.redirect("/admin");
});
module.exports = router;
