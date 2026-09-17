---
'@bedrock-core/guides': minor
---

**Breaking.** A paragraph or list item with links is drawn with `Trans`: the build breaks it into the same number of lines in every language, and each link is pressable only where its own text is drawn, in whichever language the client shows. The manifest's `GuideRun` is gone. An inline block carries `k` when it has no links, and when it has, `text` — a tagged string by locale, `See <0>the page</0>.` — and `links`, the page each numbered tag opens, matching the guides filter that writes it.
