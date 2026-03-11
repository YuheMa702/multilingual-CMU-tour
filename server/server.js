import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const publicDir = path.join(__dirname, "..", "public");

// --- Minimal security headers for dev (tighten later) ---
app.use((req, res, next) => {
  // Allow embedding for local dev tests. Will use CSP frame-ancestors in production.
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  // For dev: keep CSP loose to avoid fighting.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self';"
  );
  next();
});

app.use(express.static(publicDir));

// SPA fallback (so refresh doesn't 404)
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Dev server running: http://localhost:${PORT}`);
});
