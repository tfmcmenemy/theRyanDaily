const express = require("express");
const router = express.Router();
const { db } = require("../db");

router.get("/contact", (req, res) => {
  res.render("pages/contact", {
    pageTitle: "Contact",
    activeTab: "contact",
    form: {}, // ✅ add this
  });
});

router.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).render("pages/contact", {
      pageTitle: "Contact",
      activeTab: "contact",
      error: "Please add a message.",
      form: { name, email, message },
    });
  }

  await db.none(
    `INSERT INTO contact_messages(name, email, message) VALUES($1,$2,$3)`,
    [name || null, email || null, message.trim()]
  );

  res.render("pages/contact", {
    pageTitle: "Contact",
    activeTab: "contact",
    success: "Message saved. (You can wire this to email/SMS later.)",
    form: {},
  });
});

router.get("/support", async (req, res) => {
  const items = await db.any(
    `SELECT * FROM support_items
     WHERE is_active = TRUE
     ORDER BY sort_order ASC, created_at DESC`
  );

  res.render("pages/support", {
    pageTitle: "Support",
    activeTab: "support",
    items,
  });
});

router.get("/notfound", (req, res) => {
  res
    .status(404)
    .render("pages/notfound", { pageTitle: "Not found", activeTab: "" });
});

module.exports = router;
