---
'@bedrock-core/config': minor
---

**Breaking.** The `enum` entry type is `select`, and `EnumEntry` is `SelectEntry`. A `list` is free
strings only: `itemType` and `options` are gone from it, and a setting drawn from a fixed set is a
`multiselect`.

A `select` and a `multiselect` take `options` as a string array or a string `enum`, and both infer
from them: a select reads back as one of its options, and a multiselect as an array of them where
it read back as `string[]`. `EntryOptions` and `OptionValue` are exported beside the entry types.
