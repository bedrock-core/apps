---
'@bedrock-core/config': minor
---

A setting is drawn as the control it is, showing what is actually stored.

A shaped leaf reads the scope's stored document rather than the schema's defaults. Values are
nested the way the schema is while a field is named by its flat path, so each one is read down its
path and falls back to what the schema declares only where nothing is set. A section deep-linked
from a command fetches before its first render, so it opens on the values in the world instead of
on defaults it then has to correct.

Each row takes the shape vanilla gives that control, inside full-width dividers:

- a toggle sits beside its caption and note;
- a slider sits under its caption and note, with the value at the caption's end;
- every other control takes the note after it.

A short enum is a segmented control and a longer one stays a dropdown. A multiselect draws a
checkbox per option, answering under `<key>#<n>`, and the host folds those back into the array —
clearing the last box yields an empty array rather than dropping the setting. Save writes and then
goes back; dismissing goes back without writing. A list returns to the section holding it rather
than to the scope root, and the list editor re-presents with its patch merged down the setting's
own path.

Screen bodies share one rect inside the card's border, so the insets read equal from one screen to
the next, and an addon page keeps a narrower right inset beside the scroll gutter.
