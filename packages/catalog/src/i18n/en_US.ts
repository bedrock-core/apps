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
    guide: {
      title: 'bedrock-core',
      intro: 'Some addons in this world are built on §l@bedrock-core§r. They share the same menus, so what you learn in one works in all of them.',
      addons: '§lAddons§r: every @bedrock-core addon in the world, with its version, its settings and its guide. Open the list with §7/<addon>:catalog§r.',
      settings: '§lSettings§r: change how an addon behaves. Everyone can change their own settings, and operators can also change them for the whole world. Open them with §7/<addon>:config§r.',
      guides: '§lGuides§r: pages like this one, in your language. Open an addon\'s guide with §7/<addon>:guide§r.',
    },
  },
} as const;
