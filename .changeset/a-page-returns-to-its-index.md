---
'@bedrock-core/guides': minor
---

A guide opens on its home page, and every page is one press from the index.

`guide_home` is where a guide opens: the page marked `home: true`, the only page of a single-page
guide, or the index when there is neither. `guide_home_back` is the same entry with a back control,
what a host that opened the guide shows in its place. `guide_index` is the index itself, compiled
once, and exported as `guideIndexScreen`.

Moving inside a guide replaces rather than stacks. A page's back and its index button both open
`guide_index` in the page's place, a row of the index opens its page in the index's place, and the
index's own back leads to wherever the guide was opened from. A reader who followed six links is
one press from the index and two from the list they came from. A single-page guide has no index
button, and its back leaves the guide.

The screen names live in their own module, exported from the package root. The half that BUILDS
the screens and the half that FINDS them in another addon's pack must agree exactly, since a key is
`<namespace>:<name>` and the two never meet at runtime.
