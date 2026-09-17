---
'@bedrock-core/guides': minor
---

A page or category marked `access: op` is shown to world operators only.

A guide with anything gated is compiled once per audience. `guide_home`, `guide_home_back`,
`guide_index` and `guide_<page>` are what every player is shown: a gated page has no screen there,
the index lists only what a player may open, prev and next skip what they may not, a gated home
page is no home to them, and a link to a gated page, in a paragraph, a list, an admonition or a
component's children, is drawn as text. `guideop_home`, `guideop_home_back`, `guideop_index` and
`guideop_<page>` are the operators' set: every page, and every press inside it leads within it. A
guide with nothing gated compiles the ordinary set alone.

The entry decides which set a reader walks. `guides.open(player, addonId?)`, the `<ns>:guide`
command, a catalog's guide button and `openGuide(ns, player)` open an operator on the operators'
set when the guide has one, and everyone else on the ordinary set. A `<Link>` to `guide_home` or
`guide_home_back` is the same press for every viewer, so it always opens the ordinary set.
`openGuide(ns, player, { back: true })` opens the entry with a back control, in the set the player
reads, for a screen that links to a guide.

The screen factories take `audience: 'op'` for the operators' set, which is what the guides filter
writes, and the manifest carries `opScreens`, each page's screen name in that set.
