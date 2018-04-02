const got = require('got')
const promiseLimit = require('promise-limit')
const stack = require('callsite')
const url = require('url')
const fs = require('fs')
const path = require('path')
const util = require('util')

const defaulter = (g,d) => g !== undefined ? g : d

/** Simple Canvas API wrapper */
class Canvas {
  constructor(origFolder,defaults = {}) {
    this.authFile = path.join(origFolder,defaults.authFile || 'auth.json')
    this.baseUrl = `https://${defaults.domain||'byui'}.instructure.com`
    this.accessToken = this.readAuthFile()
    this.RateLimitRemaining = 700
    this.RateLimitBuffer = defaulter(defaults.rateLimitBuffer,300)
    this.queue = promiseLimit(defaulter(defaults.callLimit,30))
    this.minSendInterval = defaulter(defaults.minSendInterval,10)
    this.nextSendTime = Date.now()
    this.lastOverBuffer = 0
    this.checkStatusInterval = defaulter(defaults.checkStatusInterval,2000)
  }
  readAuthFile(){
    if(!fs.existsSync(this.authFile)){
      fs.writeFileSync(this.authFile,'{ "token":"" }')
      throw new Error(`Please place your auth token in the "token" property of the ${this.authFile} { "token": <ACCESS-TOKEN> }`)
    }
    let file = JSON.parse(fs.readFileSync(this.authFile))
    if(!file.token){
      throw new Error(`Please place your auth token in the "token" property of the ${this.authFile} { "token": <ACCESS-TOKEN> }`)
    }
    return file.token
  }
  range(e){
    return [...Array(e-1).keys()].map(n => n+2)
  }
  async call(blame,path, options = {}) {
    // Don't let the queue build up too high
    while(this.queue.queue > 40) await new Promise(res => setTimeout(res,500))
    
    path = new url.URL(url.resolve(this.baseUrl,path))
    
    options = Object.assign({
      method:'GET',
      // TODO: should users be able to override json attribute?
      json:true // canvas always return json
    },options)
    
    options.headers = Object.assign({
      Authorization: 'Bearer '+this.accessToken
    },options.headers)
    
    let response = await this.queue((async () => {
      // Make sure our rate limit is not over
      while(this.RateLimitRemaining < this.RateLimitBuffer){
        // Display this message if has been at least a second since it was last displayed
        if(Date.now() - this.lastOverBuffer > this.checkStatusInterval){
          console.log(`Our rate-limit-remaining (${Number(this.RateLimitRemaining).toFixed(1)}) is below our buffer (${this.RateLimitBuffer}), waiting a sec...`)
          this.lastOverBuffer = Date.now()
        }
        // The waiting a second
        await new Promise(res => setTimeout(res,this.checkStatusInterval))
        // See what the situation is now
        try{
          let response = await got(url.resolve(this.baseUrl,'/api/v1/users/self'),{
            // TODO: Is this returning JSON?
            method: 'HEAD',
            headers:{
              Authorization: 'Bearer '+this.accessToken
            }
          })
          this.RateLimitRemaining = response.headers['x-rate-limit-remaining']
        } catch(e){
          console.log('We\'re in trouble')
        }
        if(this.RateLimitRemaining === undefined){
          throw new Error("There was no x-rate-limit-remaining header")
        }
      }

      // Make sure our calls are staggered at least a little bit, like 10 milliseconds, so that the first go doesn't spam the server
      var timeTillSend = this.nextSendTime - Date.now()
      this.nextSendTime = Math.max(Date.now(),this.nextSendTime) + this.minSendInterval
      if(timeTillSend > 0){
        await new Promise(res => setTimeout(res,timeTillSend))
      }

      // Finally make the actual call
      return got(path.href,options).catch(err => {
        console.log(Object.entries(err))
        // throw new Error(`${err}\n    at ${blame.getFunctionName()||'<anonymous>'} (${blame.getFileName()}:${blame.getLineNumber()})`)
      })
    }).bind(this))

    // Update the rateLimitRemaining
    this.RateLimitRemaining = response.headers['x-rate-limit-remaining']
    // console.log(Math.floor(this.RateLimitRemaining),Number(response.headers['x-request-cost']).toFixed(3))
    // Turn my links string into a useful object
    let links = this.parseLink(response.headers.link)

    // Paginate recursivly if need to paginate
    if(links && links.current.page == 1){
      let responses = await Promise.all(this.range(+links.last.page).map(page => {
        let path = new url.URL(links.current.path)
        path.searchParams.set('page',page)

        return this.call(blame,path.href)
      }))
      try{
        response.body = response.body.concat(...responses.map(res => res.body))
      } catch (e){
        throw new Error('Assumption that paginating body is always an array, was wrong')
      }
    }
    return response
  }
  parseLink(str){
    if(str){
      return str.split(',')
        .map(str => str.match(/<(.*?page=(\d+).*?)>.*?"(.*?)"/))
        .reduce((obj,elm) => {obj[elm[3]] = {path:elm[1],page:elm[2]}; return obj},{})
    }
  }
}

function findblame(){
  let s = stack(), i = 0
  while(s[i].getFileName() == __filename){i++}
  return s[i]
}

module.exports = function(){
  let origFolder = path.dirname(stack()[1].getFileName())
  var canvas = new Canvas(origFolder,...arguments)
  function WrapWrapper(){
    let args = [...arguments], blame = findblame()
    if(typeof args[args.length-1] == 'function'){
      // expecting a callback
      if(args.length == 2){
        // they didn't give us any options
        args[2] = args[1]
        args[1] = {}
      }
      return util.callbackify(canvas.call).call(canvas,blame,...args)
    }
    return canvas.call.call(canvas,blame,...args)
  }
  return new Proxy(new Function(),{
    apply: function(target, thisArg, argumentsList){
      return WrapWrapper.apply(null,argumentsList)
    },
    get: function(target,prop){
      if(['get','post','put','patch','head','delete'].includes(prop)){
        return WrapWrapper
      } else {
        return Reflect.get(...arguments);
      }
    }
  })
}