# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).
It tracks pending version bumps + changelog entries for the three apps:
`@bedrock-core/catalog`, `@bedrock-core/config` and `@bedrock-core/guides`.

Each app is published and versioned on its own. There is no umbrella package to
install them together: they have little in common beyond the runtime they mount
on, and a realm takes the ones it wants. The repo root is `private` — a workspace
root and nothing more — so it is not a changeset target and never reaches npm.

`0.0.0` is what an unreleased package sits at, and `publish-tarballs.mjs` skips
it, so a package reaches its first release by having its `version` set by hand in
the commit that means to ship it. A changelog entry describes the delta between
two released versions, and a package with no first release has none to diff
against.

## Authoring a changeset

When you make a change worth releasing, run:

```sh
yarn changeset
```

Pick the affected package(s) and a bump level (`patch` / `minor` / `major`),
write a short summary, and commit the generated `.changeset/<name>.md` alongside
your change.

## How releasing works

Versioning is automatic; publishing is manual. The **Release** workflow
(`.github/workflows/publish.yml`) has two jobs:

- **On every push to `main`**, if changesets are pending, it opens (or refreshes)
  a **"Version Packages"** PR built by `yarn version-packages`. That runs
  `changeset version`, consuming the pending changesets, bumping the changed apps
  **and their dependents** (`updateInternalDependencies: patch`) and writing their
  CHANGELOGs. Nothing is published from a push.
- **When run by hand** (Actions → Release → Run workflow), it refuses if
  changesets are still pending, then executes `yarn release`: lint, typecheck and
  tests, then `scripts/publish-tarballs.mjs` and `changeset tag`. Each changed app
  goes to npm and is tagged `@bedrock-core/<name>@<version>`.

So a release is: merge the Version PR, then trigger the workflow.

`publish-tarballs.mjs` packs with yarn and publishes the tarball with npm rather
than running `changeset publish`: changesets shells out to npm from the workspace
directory, which ships the `workspace:*` ranges verbatim, and every consumer
install fails. A version already on the registry is skipped, so re-running after
a partial release is safe.

Nothing is checked out beside this repository: every dependency resolves from the
registry. The root `resolutions` must carry versions rather than `portal:` entries
before a release can install; that swap is the release step.

Two repo settings the workflow depends on:

- *Allow GitHub Actions to create and approve pull requests* (Settings → Actions →
  General). Without it the Version PR cannot be opened.
- A trusted publisher on npmjs.com for each package, pointing at this repo and
  `publish.yml`. Publishing authenticates through OIDC; no npm token is stored
  anywhere.
