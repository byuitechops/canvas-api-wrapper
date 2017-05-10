# canvas-api-wrapper
Simplifies the already simple canvas api calls, and handles pagenation


``` javascript
var canvas = require('canvas-api-wrapper')("<ACCESS_TOKEN>")
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
npm i --save https://github.com/byuitechops/canvas-api-wrapper.git
```