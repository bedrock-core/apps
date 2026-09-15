---
'@bedrock-core/config': minor
---

**Breaking.** A screen is drawn by the addon whose pack holds it, and a crossing carries the way
back.

Most of the UI is in every pack — the scope pickers, the menus, the list editors are the same
layouts everywhere — so whichever realm a command is typed into draws those itself. A section
shaped for one addon's schema is not: it exists in exactly one bundle, because that is the bundle
whose build compiled it. Reaching it means asking that addon's realm, and from then on its
settings, its page and its guide are served by it. No realm draws another addon's settings.

One method does all of it, `core:ui.show(playerId, target, returnTo?)`, and the third argument is
what makes a crossing survivable. A return address names a PLACE rather than a screen key — a
list, a menu level and a roster are each drawn from a model, and rendering their component with no
model draws the empty shape of the screen. Each hop carries the whole way back in the request, so
a chain of any depth walks home through the realms it came through rather than dead-ending on the
far side.

A row whose realm does not answer is still drawn here, from the page reference that addon
published, exactly as before. Handing off is what happens when the owner is present, not a
requirement for appearing at all.

The open target is now one type per app rather than one shared union: `ConfigTarget` with
`isConfigTarget` and `configTargetFrom`, and `CONFIG_METHOD` naming the method a realm serves for
it. `isOpenTarget`, `OpenTarget` and `OpenCommand` are gone — a target crosses a realm as plain
data, and each app reads its own. A realm running an older copy understands as much of a target as
it knows and falls back for the rest.

The permission clamp applies on arrival rather than at the entry points. A target also arrives
from the wire, where no caller in this realm has applied it, so a non-operator cannot reach past
their own player scope even when the request says otherwise.
