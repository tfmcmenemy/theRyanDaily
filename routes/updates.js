const express = require("express");
const router = express.Router();
const { db } = require("../db");

router.get("/", async (req, res) => {
  const updates = await db.any(
    `SELECT id, title, body, created_at
     FROM updates
     ORDER BY created_at DESC
     LIMIT 50`
  );

  res.render("updates/index", {
    pageTitle: "Updates",
    activeTab: "updates",
    updates,
  });
});

router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(404).redirect("/notfound");

  const update = await db.oneOrNone(`SELECT * FROM updates WHERE id=$1`, [id]);
  if (!update) return res.status(404).redirect("/notfound");

  const questions = await db.any(
    `SELECT * FROM questions WHERE update_id=$1 ORDER BY asked_at DESC`,
    [id]
  );

  res.render("updates/show", {
    pageTitle: update.title,
    activeTab: "updates",
    update,
    questions,
  });
});

// Ask a question on an update
router.post("/:id/questions", async (req, res) => {
  const updateId = Number(req.params.id);
  const { asker_name, asker_contact, question } = req.body;

  if (!question || !String(question).trim()) {
    return res.status(400).redirect(`/updates/${updateId}#ask`);
  }

  await db.none(
    `INSERT INTO questions(update_id, asker_name, asker_contact, question)
     VALUES($1,$2,$3,$4)`,
    [
      updateId,
      asker_name ? String(asker_name).trim() : null,
      asker_contact ? String(asker_contact).trim() : null,
      String(question).trim(),
    ]
  );

  res.redirect(`/updates/${updateId}#questions`);
});

module.exports = router;
