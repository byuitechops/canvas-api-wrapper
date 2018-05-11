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
let self = await canvas('/api/v1/users/self')
console.log(self.name)
```
#### Use Promises
``` javascript
canvas('/api/v1/users/self')
	.then(self => {
		console.log(self.name)
	})
```
#### Use Callbacks
``` javascript
canvas('/api/v1/users/self', function(err,self){
	if(err) return console.error(err);
	console.log(self.name)
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
	var modules = await canvas('/api/v1/courses/10698/modules')
	console.log(`There are ${modules.length} modules`)

	await canvas.post('/api/v1/courses/10698/modules',{
		body:{
			module:{
				name:"New Module"
			}
		}
	})

	// This query option also comes from got
	var queriedModules = await canvas('/api/v1/courses/10698/modules',{
		query:{
			search_term:'New Module'
		}
	})
	console.log('Found my new module',queriedModules)
})()
```

## Helper methods
Some of the main api calls are wrapped for your convenience 
``` javascript
// Example: publish all of the modules

const course = canvas.getCourse(19284)

const modules = await course.modules.getAll()

for(var i = 0; i < modules.length; i++){
	
	modules[i].published = true

}

await course.modules.updateAll()
```
### Course
The main Class which contains all the items
 - **`files`** <**Files**>
 - **`assignments`** <**Assignments**>
 - **`discussions`** <**Discussions**>
 - **`modules`** <**Modules**>
 - **`pages`** <**Pages**>
 - **`quizzes`** <**Quizzes**>

### Items _extends_ **Array**

The abstract class which all of the lists of items inherit from

- **`course`** <**number**>
	- the id of the course

- _async_ **`updateAll`** ( callback<sub>_opt_</sub> )
	- Updates all of the items that have had changes made to them

- _async_ **`create`** ( data , callback<sub>_opt_</sub> ) <**Item**>
	- Creates the item in canvas, with the given data. And adds it to the items property
	- `data` <**Object**> the properties to add to the created item

- _async_ **`getAll`** ( includeSub<sub>_opt_</sub> , callback<sub>_opt_</sub>  ) <**[Item]**>
	- Retrieves all of the children items from canvas
	- `includeSub` <**Boolean**> Whether to also get the sub items such as `questions` in `quiz` also whether to include the `body` in the `page` object. Defaults to `false`

- _async_ **`getOne`** ( id , includeSub<sub>_opt_</sub> , callback<sub>_opt_</sub> ) <**Item**>
	- Retrieves a single item from canvas by id
	- `id` <**number**> the id of the item to grab
	- `includeSub` <**Boolean**> Whether to also get the sub items such as `questions` in `quiz`. Defaults to `false`

- _async_ **`delete`** ( id , callback<sub>_opt_</sub> )
	- Removes an item from canvas, and from the local list
	- `id` <**number**> the id of the item to delete

### Item

The abstract class for the items to inherit from

- **`getId`** ( ) <**number**>
- **`getTitle`** ( ) <**string**>
- **`setTitle`** ( title<**string**> )
- **`getHtml`** ( ) <**string**>
- **`setHtml`** ( html<**string**> )
- _async_ **`get`** ( includeSub<sub>_opt_</sub> , callback<sub>_opt_</sub> ) <**Item**>
	- Retrieves the item from canvas
	- `includeSub` <**Boolean**> Whether to also get the sub items such as `questions` in `quiz`. Defaults to `false`
- _async_ **`update`** ( callback<sub>_opt_</sub> )
	- Only updates if properties have been changed on the Item since it was last gotten
- _async_ **`delete`** ( callback<sub>_opt_</sub> )
	- Use the delete property on **Items** instead, to delete the local copy
- _async_ **`create`** ( callback<sub>_opt_</sub> )
	- creates the item with all of it's current properties

### Assignments _extends_ **Items**
### Assignment _extends_ **Item**

### Discussions _extends_ **Items**
### Discussion _extends_ **Item**

### Files _extends_ **Items**
- Doesn't have a create method
### File _extends_ **Item**
- Doesn't have a create method

### Modules _extends_ **Items**
### Module _extends_ **Item**
- **`items`** <**ModuleItems**>
### ModuleItems _extends_ **Items**
### ModuleItem _extends_ **Item**

### Pages _extends_ **Items**
### Page _extends_ **Item**

### Quizzes _extends_ **Items**
### Quiz _extends_ **Item**
- **`questions`** <**QuizQuestions**>
### QuizQuestions _extends_ **Items**
### QuizQuestion _extends_ **Item**


## Item Gets and Sets
| Type | Title | Html | Url | Sub Items Lists |
|------------|-------|------|-----|------|
| Course | name | | /courses/<_course_> | files, assignments, discussions, modules, pages, quizzes |
| Assignment | name | description | html_url | |
| Discussion | title | message | html_url | |
| File | display_name |  | url | |
| Module | name | | courses/<_course_>/modules#context_module_<_id_> | items |
| ModuleItem | title |  | html_url | |
| Page | title | body | html_url | |
| Quizzes | title | description | html_url | questions |
| QuizQuestion | question_name | question_text | courses/<_course_>/quizzes/<_quiz_>/edit#question_<_id_> | |

