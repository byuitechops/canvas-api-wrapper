const canvas = require('./canvas')
const helpers = require('./helpers')

// Just cause proxies are so cool
module.exports = new Proxy(new Function(),{
  apply: function(target, thisArg, argumentsList){
    return canvas.apply(null,argumentsList)
  },
  get: function(target,prop){
    if(['get','post','put','patch','head','delete'].includes(prop)){
      return canvas.bind({method:prop})
    } else if(prop in helpers){
      return helpers[prop]
    } else {
      return Reflect.get(...arguments);
    }
  },
  set: function(target,prop,value){
    if(Object.keys(canvas.settings).includes(prop)){
      if(typeof canvas.settings[prop] == typeof value){
        canvas.settings[prop] = value
        if(prop == 'callLimit'){
          canvas.setCallLimit(value)
        } else if(prop == 'domain'){
          baseUrl = `https://${canvas.settings.domain}.instructure.com`
        }
      } else {
        throw new Error(prop+" was expecting a "+typeof canvas.settings[prop]+" instead of a "+typeof value)
      }
    } else {
      throw new Error("I don't have a setting with that name "+prop)
    }
  }
})