const geoip = require("geoip-lite");
const { db } = require("../db");

const STATIC_PATH_PREFIXES = ["/css/", "/js/", "/uploads/"];
const STATIC_EXT_RE =
  /\.(css|js|png|jpe?g|svg|webp|ico|gif|map|txt|pdf|zip|webm|mp4)$/i;

function normalizeIp(ip) {
  if (!ip) return null;
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function shouldSkipPath(pathname) {
  if (!pathname) return true;
  if (pathname === "/favicon.ico") return true;
  if (STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  if (STATIC_EXT_RE.test(pathname)) return true;
  return false;
}

function isHtmlResponse(res) {
  const contentType = res.getHeader("Content-Type");
  return contentType && String(contentType).includes("text/html");
}

module.exports = function pageViewsMiddleware(req, res, next) {
  if (req.method !== "GET") return next();
  if (shouldSkipPath(req.path)) return next();

  res.on("finish", () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    if (!isHtmlResponse(res)) return;

    const ip = normalizeIp(req.ip);
    let country = null;
    let region = null;
    let city = null;

    try {
      const geo = ip ? geoip.lookup(ip) : null;
      if (geo) {
        country = geo.country || null;
        region = geo.region || null;
        city = geo.city || null;
      }
    } catch (err) {
      console.error("GeoIP lookup failed:", err);
    }

    const userAgent = String(req.get("user-agent") || "").slice(0, 512);
    const path = req.path;

    db.none(
      `INSERT INTO page_views
       (path, ip, country, region, city, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [path, ip, country, region, city, userAgent || null]
    ).catch((err) => {
      console.error("Page view log failed:", err);
    });
  });

  return next();
};
