const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const compression = require("compression");
require("dotenv").config({ quiet: true });

const pagesRoutes = require("./routes/pages");
const updatesRoutes = require("./routes/updates");
const adminRoutes = require("./routes/admin");
const galleryRoutes = require("./routes/gallery");
const pageViewsMiddleware = require("./middleware/pageViews");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", 1);

// Disable helmet completely for debugging
// app.use(
//   helmet({
//     contentSecurityPolicy: false, // Disable CSP for development
//     crossOriginEmbedderPolicy: false,
//   })
// );

app.use(compression());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14 days
    },
  })
);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use(pageViewsMiddleware);

// Make these available in all templates
app.use((req, res, next) => {
  res.locals.isAdmin = Boolean(req.session.isAdmin);
  res.locals.currentPath = req.path;
  next();
});

// Health check endpoint for Digital Ocean
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (req, res) => res.redirect("/updates"));

app.use("/", pagesRoutes);
app.use("/gallery", galleryRoutes);
app.use("/updates", updatesRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res
    .status(404)
    .render("pages/notfound", { pageTitle: "Not found", activeTab: "" });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server began running at ${new Date().toLocaleString()}`);
  console.log(`Listening on port ${port}`);
});
