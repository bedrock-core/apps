---
'@bedrock-core/guides': minor
---

A page returns to the index it was opened from.

A guide is a set of compiled screens, so moving between pages replaces rather than stacks: a
reader who followed six links is one back press from the index, not six. Back and the index button
both lead there, and the index's own back leads to wherever the guide was opened from.

That "wherever" is why the index is compiled twice. `guide_home` is the index a guide opens on and
no page may fold to, and `guide_home_back` is the same index with a back button — what a host that
opened the guide shows in its place. A reader who typed `<ns>:guide` has nothing behind them; a
reader who arrived from a catalog does, and the screen they are shown says which.

Both names now live in their own module and are exported from the package root as before. The half
that BUILDS the screens and the half that FINDS them in another addon's pack must agree exactly —
a key is `<namespace>:<name>`, and the two never meet at runtime — so the names are stated once
for both.
