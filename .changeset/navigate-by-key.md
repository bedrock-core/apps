---
'@bedrock-core/guides': minor
---

**Breaking.** A guide is its compiled screens, navigated by key.

`createGuide` is removed: a page is a screen rather than a state of one. `guideReference`, `presentGuideReference`, `isGuideReference` and `GuideReference` go with it, because a guide's screens ride the ordinary screen table. `openGuide(ns, player)` is a `navigate()`, so it opens this bundle's guide or another addon's the same way. The views take link keys (`linkTo`, `homeTo`) instead of open-page callbacks.
