import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const storiesDir = path.join(projectRoot, "public", "content", "stories");
const outputFile = path.join(storiesDir, "stories.json");

async function main() {
  const files = await fs.readdir(storiesDir);

  const stories = files
    .filter((name) => /\.wav$/i.test(name))
    .map(parseStoryFilename)
    .filter(Boolean)
    .sort((a, b) => {
      const byLang = a.lang.localeCompare(b.lang);
      if (byLang !== 0) return byLang;

      const bySpeaker = a.speaker.localeCompare(b.speaker, undefined, {
        sensitivity: "base",
      });
      if (bySpeaker !== 0) return bySpeaker;

      const byTopic = a.topic.localeCompare(b.topic, undefined, {
        sensitivity: "base",
      });
      if (byTopic !== 0) return byTopic;

      return a.filename.localeCompare(b.filename, undefined, {
        sensitivity: "base",
      });
    });

  await fs.writeFile(
    outputFile,
    `${JSON.stringify(stories, null, 2)}\n`,
    "utf8",
  );

  console.log(`Generated ${stories.length} stories.`);
  console.log(`Output: ${outputFile}`);
}

function parseStoryFilename(filename) {
  const match = filename.match(
    /^([a-z]{2})_([^_]+)_([^_]+)_(\d+)\.wav$/i,
  );

  if (!match) {
    console.warn(`Skipping story with unexpected filename: ${filename}`);
    return null;
  }

  const [, langRaw, speakerRaw, topicRaw, orderRaw] = match;

  const lang = langRaw.toLowerCase();
  const speaker = formatToken(speakerRaw);
  const topic = formatToken(topicRaw);

  return {
    id: filename
      .replace(/\.wav$/i, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase(),

    filename,
    lang,
    speaker,
    topic,
    order: Number(orderRaw),

    title: topic,
    description: `${topic} story placeholder`,

    audioSrc: `./content/stories/${filename}`,
  };
}

function formatToken(token) {
  return String(token || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

main().catch((error) => {
  console.error("Failed to generate stories.json");
  console.error(error);
  process.exitCode = 1;
});