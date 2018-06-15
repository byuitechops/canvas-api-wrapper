const promiseLimit = require('promise-limit')
const got = require('got')
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
async function canvas(method,path,body,callback) {
  // Don't let the queue build up too high
  while(queue.queue > 40) await new Promise(res => setTimeout(res,500))
  
  // Check the Api Token
  if(!settings.apiToken) throw new Error('Canvas API Token was not set')
  
  // Fix the parameters
  if(typeof body == 'function'){ callback = body; body = undefined }

  // Force it to be a Promise
  if(callback){return util.callbackify(canvas)(method,path,body,callback)}
  
  // Fix the Method
  method = method.toUpperCase()
  if(!['GET','POST','PUT','DELETE'].includes(method)){
    throw new Error('Method was not get, post, put or delete')
  }

  path = new url.URL(url.resolve(baseUrl,path))
  
  var options = {
    // Resolving the path
    url: path.href,
    method:method,
    [method=='get' ? 'query' : 'body']: body,
    json: true,
    throwHttpErrors:false,
    headers: {
      Authorization: 'Bearer '+settings.apiToken,
    }
  }
  
  // Make the request (with the timing checks and stuff)
  let response = await queue(async () => {
    // Make sure our rate limit is not over
    while(rateLimitRemaining < settings.rateLimitBuffer){
      // Display this message if has been at least a second since it was last displayed
      if(Date.now() - lastOverBuffer > settings.checkStatusInterval){
        console.warn(`Our rate-limit-remaining (${Number(rateLimitRemaining).toFixed(1)}) is below our buffer (${settings.rateLimitBuffer}), waiting a sec...`)
        lastOverBuffer = Date.now()
      }
      // The waiting a second
      await new Promise(res => setTimeout(res,settings.checkStatusInterval))
      // See what the situation is now
      try{
        let response = await got.head(url.resolve(baseUrl,'/api/v1/users/self'),{
          headers:{
            Authorization: 'Bearer '+settings.apiToken
          }
        })
        rateLimitRemaining = response.headers['x-rate-limit-remaining']
      } catch(e){
        // We couldn't even make the check
        console.warn('We\'re in trouble')
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
    return got(path.href,options).then(res => {
      if(res.statusCode !== 304 && (res.statusCode < 200 || res.statusCode > 299)){
        throw new Error([
          `${method.toUpperCase()} ${path.href} failed with: ${res.statusCode}`,
          body && `${method=='get'?'Query Object':'Request Body'}\n\t${util.inspect(body,{depth:null})}`,
          typeof res.body == 'object' && `Response Body:\n\t${util.inspect(res.body,{depth:null})}`
        ].filter(n => n).join('\n    '))
      }
      return res
    })
  })

  // Update the rateLimitRemaining
  rateLimitRemaining = response.headers['x-rate-limit-remaining']
  // console.log(Math.floor(this.RateLimitRemaining),Number(response.headers['x-request-cost']).toFixed(3))
  // Turn my links string into a useful object
  let links = parseLink(response.headers.link)
  // Paginate recursivly if need to paginate
  if(links && links.current.page == 1){
    let responses = []
    if(links.last){
      let path = new url.URL(links.current.path)
      responses = await Promise.all(Array(links.last.page-1).fill().map((n,i) => i+2).map(page => {
        path.searchParams.set('page',page)
        return canvas('GET',path.href)
      }))
    } else {
      let path = new url.URL(links.current.path)
      for(var page = 2, r=['start']; r.length; page++){
        path.searchParams.set('page',page)
        r = await canvas('GET',path.href)
        responses.push(r)
      }
    }
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

module.exports = Object.defineProperties(canvas.bind(null,'GET'),{
  get: { get: () => canvas.bind(null,'GET') },
  post: { get: () => canvas.bind(null,'POST') },
  put: { get: () => canvas.bind(null,'PUT') },
  delete: { get: () => canvas.bind(null,'DELETE') },
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
