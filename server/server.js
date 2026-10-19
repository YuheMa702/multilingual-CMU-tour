import express from 'express';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname,'../public');
const manifestFile = path.join(publicDir,'content/metadata/generated.json');
const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use((req,res,next) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  // Preserves the original development CSP; allowlist the actual CMU iframe parent before embedding elsewhere.
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'self';");
  next();
});

// Backward-compatible API. The SPA and GitHub Pages both use the same generated static manifest.
app.get('/api/stories',async(req,res) => {
  try {
    const manifest = JSON.parse(await fs.readFile(manifestFile,'utf8'));
    const lang = String(req.query.lang || '').toLowerCase();
    const items = manifest.stories.map(story => {
      const available = Object.keys(story.audio || {}).sort();
      const selected = story.audio?.[lang] ? lang : story.audio?.en ? 'en' : available[0];
      return {
        id:story.id,lang:selected,speaker:story.speaker,
        title:story.names?.[lang] || story.names?.en || story.id,
        topic:story.names?.en || story.id,
        audioSrc:story.audio?.[selected] || '',
        transcriptSrc:story.transcripts?.[selected] || '',
        imageSrc:story.images?.[lang] || story.images?.[selected] || ''
      };
    });
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(503).json({error:'Content manifest not generated'});
  }
});

app.use(express.static(publicDir));
app.get('*',(_req,res)=>res.sendFile(path.join(publicDir,'index.html')));
app.listen(PORT,()=>console.log(`Dev server running: http://localhost:${PORT}`));
