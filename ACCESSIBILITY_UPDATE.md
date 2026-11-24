# Multilingual CMU Tour — accessibility update
## Photo metadata and maintenance

The editable source of truth is `public/content/metadata/image-alt.json`, not the installer's reference file. All 119 installed tour/story photographs at the inspected revision have normalized filename keys: 50 shared stop photographs (both `en` and `zh`), 43 English story photos (`en` only), 26 Chinese story photos (`zh` only). The two introductory/closing photos use identical descriptions because they are the same photograph. The additional Resources photograph has its own bilingual `hero.alt` in `resources.json`, already supplied by the Resources update. The attached spreadsheet had 124 reference rows; entries for unused photographs were not installed. The six missing catalog entries were added; five missing images could be directly inspected in GitHub, while the ballet description was taken from the spreadsheet because GitHub did not return its image bytes.

Use meaningful descriptions of visible information, not filenames or “Photo 1”. Avoid guessing details. If a photograph is replaced in place, update its description too. When adding/removing or renaming a photo, add/remove/rename the corresponding JSON entry. Keep the story description in the language in its actual filename, and supply every enabled language for shared stop images.

```json
{
  "schemaVersion": 1,
  "images": {
    "stop--gates--001.jpg": {"en": "English description", "zh": "中文描述"},
    "story--example-1--zh--001.jpg": {"zh": "中文描述"}
  }
}
```

For a new language, translate shared stop images and the Resources hero, add story-photo descriptions for that language, and supply UI labels (`previousImageAria`, `nextImageAria`, `audioProgressAria`, `collapseTranscriptAria`, `transcriptAria`) in `ui.json` before enabling it. `npm run check` enforces photo coverage, story language rules, and Resources hero coverage. No JavaScript changes are necessary for content-only updates. Do not edit generated.json. Decorative graphics may intentionally use `alt=""`; meaningful content photos must have nonempty descriptions. Existing text-labeled onboarding illustrations are decorative; functional controls receive accessible names. The reference JSON in scripts is installation data only.

## Accessibility improvements

- The root no longer uses the application role; HTML language reflects the selected UI language (`zh-Hans` for Simplified Chinese).
- Native play/pause button handles keyboard activation and announces the current action. Redundant icon descriptions are empty.
- Seek control exposes slider role, duration/current position, and keyboard interaction: arrow keys +/-5 seconds, Home/End, Page Up/Down +/-10% of duration.
- Existing menu items and transcript-expansion controls accept Enter and Space; closed off-canvas menus and inactive menu views are inert. The open menu is a modal dialog with focus movement, Tab wrap and Escape/return-focus handling.
- Photo navigation and transcript controls have localized labels; selected story, slideshow dot and transcript cue states are exposed. Focus indicators appear for keyboard use; reduced-motion preference is respected. Existing default layout/colors are unchanged.
- Resources page retains native details/summary, official external links, and bilingual hero image descriptions.

## Manual verification before release

1. Run the full existing `npm run check` against the real repository, not a fixture. Inspect the generated warning report. Test on mobile and desktop in both languages.
2. Tab through language selection, onboarding, stop navigation, photo slides, audio controls, story carousel, menu/settings and Resources. Check Enter/Space, keyboard seek, Escape, focus restoration, and focus visibility. Confirm mouse/touch playback still works and audio stops on navigation.
3. Verify images against each real photograph and inspect the accessibility tree; test NVDA/Firefox or Chrome and VoiceOver/Safari, including switching language and reading the full transcript. Check text resize to 200%, narrow 320 CSS-pixel layout, zoom/reflow, color contrast on photos and gradients, and no keyboard traps. Test with reduced motion enabled. Test actual mobile Safari touch behavior.
4. Use axe DevTools or Lighthouse as additional automated checks; then manually audit all applicable WCAG 2.1 A/AA success criteria (automated tools alone cannot demonstrate conformance). Review the timed onboarding sequence for users who need extra reading time, and verify the user can operate it without a mouse. Review mixed-language fallback content, visual contrast, link destinations and media error states.
5. Complete transcripts for every prerecorded audio-only recording. Missing transcripts are currently nonfatal compiler warnings, but they need equivalent text alternatives for WCAG 2.1 SC 1.2.1. This update does not invent or transcribe their missing narration. Check all existing transcripts for accuracy as well.