# Multilingual CMU Tour App

## Week 1 Notes
### What works
- Vanilla JS SPA (ES modules) with hash routing
- Language gate -> onboarding -> main placeholder flow
- Onboarding "don't show again" persisted via localStorage
- App embeds in an iframe (embed-test parent page)

### CMU constraints to honor
- Accessibility: WCAG 2.1 AA required for public-facing CMU sites/apps
  - https://www.cmu.edu/computing/dao/policy-guidance/index.html
- CMU web accessibility best practices:
  - https://www.cmu.edu/web/best-practices/accessibility/index.html
- Embedding will require CSP frame-ancestors allowlist to permit the parent CMU webpage
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors

### Next week goals
- Add JSON manifests for stops/languages
- Load manifest and render stop list (still with placeholder media)
- Establish content folder conventions for adding languages/stops
