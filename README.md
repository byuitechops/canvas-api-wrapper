# canvas-api-wrapper
Simplifies the already simple canvas api calls, and handles pagenation and throttling

## Get Started
#### Install
```
npm i --save canvas-api-wrapper
```
#### Setup
``` javascript
var canvas = require('canvas-api-wrapper')
```
Authorization:
```
canvas.apiToken = '<TOKEN>'
```
``` bash
# Powershell
$env:CANVAS_API_TOKEN="<TOKEN>"
# CMD
set CANVAS_API_TOKEN="<TOKEN>"
# Linux & Mac
export CANVAS_API_TOKEN="<TOKEN>"
```

#### Use Await
``` javascript
let response = await canvas('/api/v1/users/self')
console.log(response.body.name)
```
#### Use Promises
``` javascript
canvas('/api/v1/users/self')
	.then(response => {
		console.log(response.body.name)
	})
```
#### Use Callbacks
``` javascript
canvas('/api/v1/users/self', function(err,response){
	if(err) return console.error(err);
	console.log(response.body.name)
})
```


## Signatures
The options parameter is the same as [got options](https://www.npmjs.com/package/got#user-content-api)
``` javascript
canvas(url[,options][,callback]) // uses a GET request

canvas.get(url[,options][,callback])

canvas.post(url[,options][,callback])

canvas.put(url[,options][,callback])

canvas.patch(url[,options][,callback])

canvas.head(url[,options][,callback])

canvas.delete(url[,options][,callback])
```

### Default Settings
``` javascript
// the subdomain under canvas 
//  https://<domain>.instructure.com
canvas.domain = 'byui';

// Scale of 0 to 700, you get filled up to 700 and if you go under
// 0 then canvas will start sending you 403 (unauthorized) or tell 
// you that the servers are melting. So when it goes past this number
// I will halt the requests until it gets filled back to this level
// Give it a pretty large buffer, it tends to go quite a ways past the
// buffer before I catch it.
canvas.rateLimitBuffer = 300;

// How many to send synchronously at the same time, the higher this
// number, the more it will go over your rateLimitBuffer
canvas.callLimit = 30;

// How much the calls are staggered (milliseconds) especially at the
// beginning so that it doesn't send the callLimit all at the same time
canvas.minSendInterval = 10;

// After it goes under the rateLimitBuffer, how often to check what the
// buffer is at now, this should be pretty high because there will be
// a lot of threads checking at the same time.
canvas.checkStatusInterval = 2000;
}
```

### Examples
``` js
(async () => {
	var res = await canvas('/api/v1/courses/10698/modules')
	console.log(`There are ${res.body.length} modules`)

	await canvas.post('/api/v1/courses/10698/modules',{
		body:{
			module:{
				name:"New Module"
			}
		}
	})

	// This query option also comes from got
	res = await canvas('/api/v1/courses/10698/modules',{
		query:{
			search_term:'New Module'
		}
	})
	console.log('Found my new module',res.body)
})()
```