const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const { db } = require("../db");

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  return res.redirect("/admin/login");
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

router.get("/updates/new", requireAdmin, (req, res) => {
  res.render("updates/new", {
    pageTitle: "New Update",
    activeTab: "",
    form: {},
  });
});

router.post("/updates", requireAdmin, async (req, res) => {
  const title = String(req.body.title || "").trim();
  const body = String(req.body.body || "").trim();

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

  res.redirect(`/updates/${created.id}`);
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

module.exports = router;
