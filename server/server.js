import express from "express";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const publicDir = path.join(__dirname, "..", "public");
const storiesDir = path.join(publicDir, "content", "stories");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self';"
  );
  next();
});

app.get('/api/stories', async (req, res) => {
  const requestedLang = String(req.query.lang || 'en').toLowerCase();

  try {
    const files = await fs.readdir(storiesDir);
    const stories = files
      .filter((name) => /\.wav$/i.test(name))
      .map(parseStoryFilename)
      .filter(Boolean)
      .filter((story) => story.lang === requestedLang)
      .sort((a, b) => {
        const bySpeaker = a.speaker.localeCompare(b.speaker, undefined, { sensitivity: 'base' });
        if (bySpeaker !== 0) return bySpeaker;
        const byTopic = a.topic.localeCompare(b.topic, undefined, { sensitivity: 'base' });
        if (byTopic !== 0) return byTopic;
        return a.filename.localeCompare(b.filename, undefined, { sensitivity: 'base' });
      });

    res.json(stories);
  } catch {
    res.json([]);
  }
});

app.use(express.static(publicDir));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Dev server running: http://localhost:${PORT}`);
});

function parseStoryFilename(filename) {
  const match = filename.match(/^([a-z]{2})_([^_]+)_([^_]+)_(\d+)\.wav$/i);
  if (!match) return null;

  const [, langRaw, speakerRaw, topicRaw, orderRaw] = match;
  const lang = langRaw.toLowerCase();
  const speaker = formatToken(speakerRaw);
  const topic = formatToken(topicRaw);

  return {
    id: filename.replace(/\.wav$/i, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase(),
    filename,
    lang,
    speaker,
    topic,
    order: Number(orderRaw),
    title: topic,
    description: `${topic} story placeholder`,
    audioSrc: `/content/stories/${filename}`
  };
}

function formatToken(token) {
  return String(token || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}
