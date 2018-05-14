const canvas = require('./canvas')
const helpers = require('./helpers')

/* Add all the helper functions */
Object.assign(canvas,helpers)
Object.defineProperties(canvas,{
  get: { get: () => canvas.bind({method:'GET'}) },
  post: { get: () => canvas.bind({method:'POST'}) },
  put: { get: () => canvas.bind({method:'PUT'}) },
  patch: { get: () => canvas.bind({method:'PATCH'}) },
  head: { get: () => canvas.bind({method:'HEAD'}) },
  delete: { get: () => canvas.bind({method:'DELETE'}) },
})

module.exports = canvas
