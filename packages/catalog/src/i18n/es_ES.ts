export default {
  addons: {
    title: 'Addons',
    authors: 'Autor(es):',
    version: 'Versión: {{version}}',
    config: 'Ajustes',
    guide: 'Guía',
  },
  framework: {
    name: '@bedrock-core',
    creator: 'DrAv0011',
    description: 'Addons Better Connected',
    guide: {
      title: 'bedrock-core',
      intro: 'Algunos addons de este mundo están hechos con §l@bedrock-core§r. Comparten los mismos menús, así que lo que aprendes en uno sirve en todos.',
      addons: '§lAddons§r: todos los addons de @bedrock-core del mundo, con su versión, sus ajustes y su guía. Abre la lista con §7/<addon>:catalog§r.',
      settings: '§lAjustes§r: cambia cómo se comporta un addon. Todos pueden cambiar sus propios ajustes, y los operadores también pueden cambiarlos para todo el mundo. Ábrelos con §7/<addon>:config§r.',
      guides: '§lGuías§r: páginas como esta, en tu idioma. Abre la guía de un addon con §7/<addon>:guide§r.',
    },
  },
} as const;
