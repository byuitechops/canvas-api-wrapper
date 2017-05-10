# canvas-api-wrapper
Simplifies the already simple canvas api calls, and handles pagenation


``` javascript
var canvas = require('canvas-api-wrapper')("<ACCESS_TOKEN>","<DOMAIN>") // Domain example -> 'byuh'
var courseId = 12

// gets all 170 pages at the same time in 40 page requests
canvas.call(`courses/${courseId}/pages`,{per_page:40}) 
	.then(console.log)
	
	// can format the call how ever you want
	.then(canvas.wrapCall(`/api/v1/courses/${courseId}/users`)) 
	.then(console.log)
	
	.catch(console.error)
```

### Install
```
npm i --save canvas-api-wrapper
```
