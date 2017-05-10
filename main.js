var request = require('request')
var qs = require('qs')
var mapLimit = require('async/mapLimit')

/** Simple Canvas API wrapper */
class Canvas {
	constructor(accessToken,domain) {
		this.baseUrl = `https://${domain||'byui'}.instructure.com`
		this.accessToken = accessToken
		this.callLimit = 20
	}
	call(apiCall, options) {
		function range(e){
			// fancy stuff, don't question it
			return [...Array(e-1).keys()].map(n => n+2)
		}
		return new Promise((resolve, reject) => {
			options = options || {}
			// fix the front if needed
			apiCall = apiCall.replace(/api\/v1\/|^\/|^/,'/api/v1/')
			options.access_token = this.accessToken
			request(this.baseUrl + apiCall + '?' + qs.stringify(options), (error, response, body) => {
				// some error handling
				if (error || response.statusCode != 200) { reject(error); return }
				// I'm just going to assume I'm always going to get JSON
				var data = JSON.parse(body)
				// Turn my links string into a useful object
				var links = this.parseLink(response.headers.link)
				// If there are actually links and it tells us what the last page is, 
				// get all of them at the same time
				if(links && links.last){
					// Using async mapLimit just for fun
					mapLimit(range(+links.last.page),this.callLimit,(item,callback) => {
						options.page = item
						request(this.baseUrl + apiCall + '?' + qs.stringify(options), (error, response, body) => {
							callback(error,JSON.parse(body))
						})
					},(err,results) => {
						if(err){reject(err); return}
						// Magic happening which will flatten the array, and keep them in thier order
						results.unshift(data)
						resolve(results.reduce(this.appendData))
					})
				} else if(links && links.next){
					// Go through them one at a time, with a recursive function
					this.getNext(links.next.call,data,resolve,reject)
				} else {
					// Either there were no links, or this is the only page
					resolve(data)
				}
			})
		})
	}
	wrapCall(apiCall, options) {
		return function () {
			return this.call(apiCall, options)
		}.bind(this)
	}
	parseLink(str){
		if(str)
			return str.split(',')
				.map(str => str.match(/<(.*?page=(\d+).*?)>.*?"(.*?)"/))
				.reduce((obj,elm) => {obj[elm[3]] = {call:elm[1],page:elm[2]}; return obj},{})
	}
	getNext(call,bucket,resolve,reject){
		request(call+'&access_token='+this.accessToken,(error, response, body) => {
			if(error){
				reject(error); return
			}
			bucket = this.appendData(bucket,JSON.parse(body))
			var links = this.parseLink(response.headers.link)
			if(links && links.next)
				this.getNext(links.next.call,bucket,resolve,reject)
			else 
				resolve(bucket)
		})
	}
	appendData(bucket,data){
		if(Array.isArray(bucket)){
			// if arrays, just concat them
			return bucket.concat(Array.isArray(data)?data:[data])
		} else if(Object.keys(bucket).length == 1 && Array.isArray(bucket[Object.keys(bucket)[0]])){
			// 
			return bucket[Object.keys(bucket)[0]].concat(data[Object.keys(data)[0]])
		} else {
			return [bucket,data]
		}
	}
}

module.exports = function(){
	var canvas = new Canvas(...arguments)
	return {
		call:canvas.call,
		wrapCall:canvas.wrapCall
	}
}