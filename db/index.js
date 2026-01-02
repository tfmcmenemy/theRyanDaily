const pgp = require("pg-promise")();

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL in .env");
  process.exit(1);
}

const db = pgp(process.env.DATABASE_URL);

module.exports = { db, pgp };
