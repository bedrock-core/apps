---
'@bedrock-core/config': minor
---

**Breaking.** A screen is drawn by the addon whose pack holds it, and a crossing carries the way
back.

A config target naming another addon is handed to that addon's realm before anything is drawn:
the screens read and write the addon's own scopes, so its settings, its page and its guide are
served by it. No realm draws another addon's settings.

Config is local. `configOf(core).of()`, `configOf(core).subscribe()`, `RemoteConfigAccessor`,
`TypedRemoteConfig`, `ConfigAccessOptions`, the nine `core:config.<scope>.<get|patch|set>` RPC
methods and the `core-config/schema` and `core-config/groups` announcements are gone, and
`configOf(core).local` gains `groups`. An addon that wants its settings read or written from
another realm serves them over its own RPC.

One method does all of it, `core:ui.show(playerId, target, returnTo?)`, and the third argument is
what makes a crossing survivable. A return address names a PLACE rather than a screen key — a
list, a menu level and a roster are each drawn from a model, and rendering their component with no
model draws the empty shape of the screen. Each hop carries the whole way back in the request, so
a chain of any depth walks home through the realms it came through rather than dead-ending on the
far side.

A row whose realm does not answer is still drawn here, from the page reference that addon
published, exactly as before. Handing off is what happens when the owner is present, not a
requirement for appearing at all.

The open target is now one per app rather than one shared union, and internal to it.
`isOpenTarget`, `OpenTarget` and `OpenCommand` are gone — a target crosses a realm as plain
data, and each app reads its own. A realm running an older copy understands as much of a target as
it knows and falls back for the rest.

The permission clamp applies on arrival rather than at the entry points. A target also arrives
from the wire, where no caller in this realm has applied it, so a non-operator cannot reach past
their own player scope even when the request says otherwise.
