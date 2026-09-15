/**
 * The catalog's own UI strings.
 *
 * Keyed under the `core` namespace, the same one the rest of the bedrock-core family uses, and
 * folded into every consuming addon's `.lang` by the i18n Regolith filter. Merge is
 * last-write-wins per key, so an addon that wants to rename something — "Addons" to "Mods",
 * say — ships `core.addons.title` itself and wins.
 *
 * This is the DEFAULT locale, and its shape is the type. Every other locale in this directory
 * must carry exactly these paths; the build checks it.
 */
export default {
  addons: {
    title: 'Addons',
    authors: 'Author(s):',
    version: 'Version: {{version}}',
    config: 'Config',
    guide: 'Guide',
  },

  framework: {
    name: '@bedrock-core',
    creator: 'DrAv0011',
    description: 'Addons Better Connected',
  },
} as const;
