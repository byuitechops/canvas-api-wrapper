const tiny = require('tiny-json-http')
const promiseLimit = require('promise-limit')
const url = require('url')
const util = require('util')

const settings = {
  apiToken: process.env.CANVAS_API_TOKEN || '',
  minSendInterval: 10,
  checkStatusInterval: 2000,
  subdomain:'byui'
}

// I hate global variables, but somehow I need to save info from call to call
let queue = promiseLimit(30),
  nextSendTime = Date.now(),
  lastOverBuffer = 0,
  rateLimitRemaining = 700,
  baseUrl = `https://${settings.subdomain}.instructure.com`

// The center of the universe
async function canvas(path, body, callback) {
  // Don't let the queue build up too high
  while(queue.queue > 40) await new Promise(res => setTimeout(res,500))
  
  // Check the Api Token
  if(!settings.apiToken) throw new Error('Canvas API Token was not set')
  
  // Fix the parameters
  if(typeof body == 'function'){ callback = body; body = undefined }

  // Force it to be a Promise
  if(callback){return util.callbackify(canvas.bind(this))(path,body,callback)}
  
  // Fix the Method
  var method
  if(Object.keys(this).length == 1 && this.method){
    method = this.method && this.method.toLowerCase()
  } else {
    method = 'get'
  }
  if(!['get','post','put','del'].includes(method)){
    throw new Error('Method was not get, post, put or del')
  }

  path = new url.URL(url.resolve(baseUrl,path))
  
  var options = {
    // Resolving the path
    url: path.href,
    data: body,
    headers: {
      Authorization: 'Bearer '+settings.apiToken,
      "Content-Type":"application/json"
    }
  }
  
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
        let response = await tiny.get({
          url:url.resolve(baseUrl,'/api/v1/users/self'),
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

    // log that we are going to make a call
    if(typeof settings.oncall == "function"){
      settings.oncall({
        method:method.toUpperCase(),
        url: options.url,
        body: options.data
      })
    }

    // Finally make the actual call
    return tiny[method](options).catch(err => {
      var myerr = new Error(`${method.toUpperCase()} ${path.href} failed with: ${err.toString().match(/\d+$/)}${body ? `\n    ${method=='get'?'Query Object':'Request Body'}:\n\t${util.inspect(body,{depth:null})}` : ''}
    Response Body:\n\t${util.inspect(err.body,{depth:null})}`)
      throw myerr
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
      return canvas(path.href)
    }))
    try{
      response.body = response.body.concat(...responses)
    } catch (e){
      throw new Error('Assumption that paginating body is always an array, was wrong')
    }
  }

  return response.body
}

// Parses canvas's crazy pagination method
function parseLink(str){
  if(str){
    return str.split(',')
      .map(str => str.match(/<(.*?page=(\d+).*?)>.*?"(.*?)"/))
      .reduce((obj,elm) => {obj[elm[3]] = {path:elm[1],page:elm[2]}; return obj},{})
  }
}

Object.defineProperties(canvas,{
  get: { get: () => canvas.bind({method:'GET'}) },
  post: { get: () => canvas.bind({method:'POST'}) },
  put: { get: () => canvas.bind({method:'PUT'}) },
  delete: { get: () => canvas.bind({method:'DEL'}) },
  apiToken:{ set: val => settings.apiToken = val },
  minSendInterval:{ set: val => settings.minSendInterval = val },
  checkStatusInterval:{ set: val => settings.checkStatusInterval = val },
  oncall: {
    set: val => settings.oncall = val,
    get: () => settings.oncall
  },
  subdomain:{ 
    set: val => {
      settings.subdomain = val 
      baseUrl = `https://${settings.subdomain}.instructure.com`
    },
    get: () => settings.subdomain
  },
  callLimit:{ 
    set: val => {
      if(queue.queue == 0){
        queue = promiseLimit(val)
      } else {
        throw new Error("Can't change the queue size while the queue is in operation")
      }
    }
  },
})

module.exports = canvas