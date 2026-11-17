const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\u00df/gi, 'ss')
    .replace(/[ßẞ]/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

module.exports = { slugify }
