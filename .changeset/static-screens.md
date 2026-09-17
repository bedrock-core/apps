---
'@bedrock-core/guides': minor
'@bedrock-core/config': minor
---

A guide page ships as a table, not as a component.

A guide page is a static screen: every string it shows is baked and every press it takes is a `<Link>`. `GuideBlockList`, `GuidePageView`, `GuideHomeView` and the guide manifest are absent from a built addon, and opening a page is one form call. `openGuide(ns, player)` no longer takes the manifest: it navigates to the guide's key, and the manifest is build input that never reaches the addon. A `cmp` block in a guide may not take a press: somewhere to go is a `<Link>`, anything else is decoration.
