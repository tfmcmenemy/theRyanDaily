# Nephew Updates (Express + EJS + Postgres)

## Setup
1) Copy env:
   cp .env.example .env

2) Create tables:
   psql "$DATABASE_URL" -f src/db/schema.sql

3) Run:
   npm run dev
