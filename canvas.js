const got = require('got')
const promiseLimit = require('promise-limit')
const stack = require('callsite')
const url = require('url')
const util = require('util')

const settings = {
  domain:'byui',
  apiToken: process.env.CANVAS_API_TOKEN || '',
  rateLimitBuffer: 300,
  callLimit: 30,
  minSendInterval: 10,
  checkStatusInterval: 2000,
}

// I hate global variables, but somehow I need to save info from call to call
let queue = promiseLimit(settings.callLimit),
  nextSendTime = Date.now(),
  lastOverBuffer = 0,
  baseUrl= `https://${settings.domain}.instructure.com`,
  rateLimitRemaining = 700

// The center of the universe
async function call(blame,path, options = {}) {
  // Don't let the queue build up too high
  while(queue.queue > 40) await new Promise(res => setTimeout(res,500))
  
  // Resolving the path
  path = new url.URL(url.resolve(baseUrl,path))
  
  // Setting up the options
  options = Object.assign({
    method:this.method,
  },options)
  // Always use json even if the user specifies not to
  options.json = true
  // Set the authorization token
  options.headers = Object.assign({
    Authorization: 'Bearer '+settings.apiToken,
  },options.headers)
  
  // Make the request (with the timing checks and stuff)
  let response = await queue(async () => {
    // Make sure our rate limit is not over
    while(rateLimitRemaining < settings.rateLimitBuffer){
      // Display this message if has been at least a second since it was last displayed
      if(Date.now() - lastOverBuffer > settings.checkStatusInterval){
        console.log(`Our rate-limit-remaining (${Number(rateLimitRemaining).toFixed(1)}) is below our buffer (${settings.rateLimitBuffer}), waiting a sec...`)
        lastOverBuffer = Date.now()
      }
      // The waiting a second
      await new Promise(res => setTimeout(res,settings.checkStatusInterval))
      // See what the situation is now
      try{
        let response = await got(url.resolve(baseUrl,'/api/v1/users/self'),{
          method: 'HEAD',
          headers:{
            Authorization: 'Bearer '+settings.apiToken
          }
        })
        rateLimitRemaining = response.headers['x-rate-limit-remaining']
      } catch(e){
        // We couldn't even make the check
        console.log('We\'re in trouble')
      }
      if(rateLimitRemaining === undefined){
        throw new Error("There was no x-rate-limit-remaining header")
      }
    }

    // Make sure our calls are staggered at least a little bit, 
    // like 10 milliseconds, so that the first calls doesn't spam the server
    var timeTillSend = nextSendTime - Date.now()
    nextSendTime = Math.max(Date.now(),nextSendTime) + settings.minSendInterval
    if(timeTillSend > 0){
      await new Promise(res => setTimeout(res,timeTillSend))
    }

    // Finally make the actual call
    return got(path.href,options).catch(err => {
      // editing the err so that the call stack points to the owner
      throw combineErrors(err,blame)
    })
  })

  // Update the rateLimitRemaining
  rateLimitRemaining = response.headers['x-rate-limit-remaining']
  // console.log(Math.floor(this.RateLimitRemaining),Number(response.headers['x-request-cost']).toFixed(3))
  // Turn my links string into a useful object
  let links = parseLink(response.headers.link)

  // Paginate recursivly if need to paginate
  if(links && links.current.page == 1){
    let responses = await Promise.all(Array(links.last.page-1).fill().map((n,i) => i+2).map(page => {
      let path = new url.URL(links.current.path)
      path.searchParams.set('page',page)
      return call(blame,path.href)
    }))
    try{
      response.body = response.body.concat(...responses)
    } catch (e){
      throw new Error('Assumption that paginating body is always an array, was wrong')
    }
  }

  return response.body
}

// Mashes the callstack into the got error
function combineErrors(err,stack){
  let i = 0, str = err.toString()+'\n'
  while(stack[i].getFileName() == __filename){i++}
  for(;i < stack.length; i++){
    str+= `    at ${stack[i].getFunctionName() || 'anonymous'} (${stack[i].getFileName()}:${stack[i].getLineNumber()})\n`
  }
  err.stack = str
  return err
}

// Parses canvas's crazy pagination method
function parseLink(str){
  if(str){
    return str.split(',')
      .map(str => str.match(/<(.*?page=(\d+).*?)>.*?"(.*?)"/))
      .reduce((obj,elm) => {obj[elm[3]] = {path:elm[1],page:elm[2]}; return obj},{})
  }
}

// Is responsible for our making our crazy function signiture
module.exports = function canvas(){
  if(!settings.apiToken){
    throw new Error('Canvas API Token was not set')
  }
  let args = [...arguments], blame = stack()
  if(typeof args[args.length-1] == 'function'){
    // expecting a callback
    if(args.length == 2){
      // they didn't give us any options
      args[2] = args[1]
      args[1] = {}
    }
    return util.callbackify(call).call(this,blame,...args)
  }
  return call.call(this,blame,...args)
}

module.exports.settings = settings
module.exports.setCallLimit = function(callLimit){
  if(queue.queue == 0){
    queue = promiseLimit(callLimit)
  } else {
    throw new Error("Can't change the queue size while the queue is in operation")
  }
}