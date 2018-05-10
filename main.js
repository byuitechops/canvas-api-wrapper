const canvas = require('./canvas')
const helpers = require('./helpers')

/* Add all the helper functions */
Object.assign(canvas,helpers)
Object.defineProperties(canvas,{
  get: { get: () => canvas.bind({method:'get'}) },
  post: { get: () => canvas.bind({method:'post'}) },
  put: { get: () => canvas.bind({method:'put'}) },
  patch: { get: () => canvas.bind({method:'patch'}) },
  head: { get: () => canvas.bind({method:'head'}) },
  delete: { get: () => canvas.bind({method:'delete'}) },
})

module.exports = canvas
