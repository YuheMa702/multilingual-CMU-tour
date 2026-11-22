# Multilingual CMU Tour

Demo: https://yuhema702.github.io/multilingual-CMU-tour/

**Content contributor guide:** [CONTENT_MIGRATION_GUIDE.md](CONTENT_MIGRATION_GUIDE.md)

The app is a vanilla-JavaScript single-page campus-tour site served by GitHub Pages or by the included Express server. Content is managed through flat `public/content/audio`, `public/content/transcripts`, `public/content/images` directories and editable metadata files: `stops.tsv`, `stories.tsv`, `ui.json`, and `image-alt.json`. A Node build script generates the static content index used by both hosting configurations.

Local testing commands:

```bash
npm run check
cd server
npm install
npm start
```

Adding a stop or story does not require editing JavaScript; see the contributor guide for file naming conventions and validation details.
