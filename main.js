const canvas = require('./canvas')
const helpers = require('./helpers')

/* Add all the helper functions */
Object.assign(canvas,helpers)

module.exports = canvas
