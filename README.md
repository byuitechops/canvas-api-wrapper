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
canvas.domain = '<sub domain>' // default: byui
```
Authorization:
```js
canvas.apiToken = "<TOKEN>"
```
``` bash
# Powershell
$env:CANVAS_API_TOKEN="<TOKEN>"

# CMD
set CANVAS_API_TOKEN="<TOKEN>"

# Linux & Mac
export CANVAS_API_TOKEN="<TOKEN>"
```

## Helpers
The CRUD operations for Assignments, Quizzes, Modules, Discussions, Pages, Files and Folders are wrapped for convenience
``` js
// Example: Publish all Modules

// a synchronous function to get an instance of the Course class
const course = canvas.getCourse(19284)

// Retrieves all of the modules in the course
await course.modules.getAll()

// course.modules inherits from the Array class, so array operations work
course.modules.forEach(module => {

	module.published = true

})

// This will only send the POST requests on it and/or its children 
// that have been changed
await course.update()
```

### Course _extends_ [Item](#item)
The main Class which is returned from `canvas.getCourse()`
 - **`files`** <[Files]>
 - **`folders`** <[Folders]>
 - **`assignments`** <[Assignments]>
 - **`discussions`** <[Discussions]>
 - **`modules`** <[Modules]>
 - **`pages`** <[Pages]>
 - **`quizzes`** <[Quizzes]>
 
``` js
var course = canvas.getCourse(17829)

// this will get the course object and attach the properties to the course
await course.get()
// allowing you to do 
course.getTitle()
course.is_public = true
await course.update()

// turning on the includeSub option, will retrieve every single item and 
// their sub items in the course. This is not recommended (of course) but 
// can be helpful in certain situations where you need every item
await course.get(true)
course.quizzes[0].questions[0].getTitle()
course.modules[0].items[0].getTitle()
course.assignments[0].getTitle()

// Update searches through all of the children for changes, and updates
// only those with changes. So just doing course.update() will push all
// changes made anywhere in the course.
await course.update()
```

### Items _extends_ **Array**

The abstract class which all of the lists of items inherit from

- **`course`** <**number**>
	- the id of the course

- _async_ **`updateAll`** ( callback<sub>_opt_</sub> )
	- Updates all of the items that have had changes made to them or their children

``` js
const course = canvas.getCourse(19823)
await course.assignments.getAll()
course.assignments.forEach(assignment => {
	if(assignment.getTitle() == 'potato'){
		assignment.setTitle('Baked Potato')
		assignment.published = true
	}
})
// Only updates items named potato, because those were the only ones changed
await course.assignments.updateAll()
```

- _async_ **`create`** ( data , callback<sub>_opt_</sub> ) <[Item](#item)>
	- Creates the item in canvas, with the given data. And adds it to the items property
	- `data` <**Object**> the properties to add to the created item

``` js
const course = canvas.getCourse(19823)
const page = await course.pages.create({
	title:'Hello World',
	body:'<h1>Hello World</h1>',
	published: true
})
console.log(page.getId())
```

- _async_ **`getAll`** ( includeSub<sub>_opt_</sub> , callback<sub>_opt_</sub>  ) <**[Item]**>
	- Retrieves all of the children items from canvas
	- `includeSub` <**Boolean**> Whether to also get the sub items such as `questions` in `quiz` also whether to include the `body` in the `page` object. Defaults to `false`
``` js
const course = canvas.getCourse(19823)
await course.modules.getAll()
console.log(course.modules)

// using the includeSub option also gets all of the items for each module
await course.modules.getAll(true)
console.log(course.modules[0].items)
```

- _async_ **`getOne`** ( id , includeSub<sub>_opt_</sub> , callback<sub>_opt_</sub> ) <[Item](#item)>
	- Retrieves a single item from canvas by id
	- `id` <**number**> the id of the item to grab
	- `includeSub` <**Boolean**> Whether to also get the sub items such as `questions` in `quiz`. Defaults to `false`
``` js
const course = canvas.getCourse(19823)
const folder = course.folders.getOne(114166)
console.log(folder)
```
- _async_ **`delete`** ( id , callback<sub>_opt_</sub> )
	- Removes an item from canvas, and from the local list
	- `id` <**number**> the id of the item to delete
``` js
const course = canvas.getCourse(19823)
await course.quizzes.getAll()
const questions = await course.quizzes[0].questions.getAll()
await questions.delete(questions[0].getId())
```
### Item

The abstract class for the items to inherit from

- **`getId`** ( ) <**number**>
- **`getTitle`** ( ) <**string**>
- **`setTitle`** ( title<**string**> )
- **`getHtml`** ( ) <**string**>
- **`setHtml`** ( html<**string**> )
- **`getUrl`** ( ) <**string**>
- _async_ **`get`** ( includeSub<sub>_opt_</sub> , callback<sub>_opt_</sub> ) <[Item](#item)>
	- Retrieves the item from canvas
	- `includeSub` <**Boolean**> Whether to also get the sub items such as `questions` in `quiz`. Defaults to `false`
- _async_ **`update`** ( callback<sub>_opt_</sub> )
	- Only updates if properties have been changed on the Item since it was last gotten
- _async_ **`delete`** ( callback<sub>_opt_</sub> )
	- Use the delete property on [Items](#items-extends-array) instead, to delete the local copy
- _async_ **`create`** ( callback<sub>_opt_</sub> )
	- creates the item with all of it's current properties

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



### Assignments _extends_ [Items](#items-extends-array)
### Assignment _extends_ [Item](#item)

### Discussions _extends_ [Items](#items-extends-array)
### Discussion _extends_ [Item](#item)

### Files _extends_ [Items](#items-extends-array)
- Doesn't have a create method
### File _extends_ [Item](#item)
- Doesn't have a create method

### Folders _extends_ [Items](#items-extends-array)
### Folders _extends_ [Item](#item)

### Modules _extends_ [Items](#items-extends-array)
### Module _extends_ [Item](#item)
- **`items`** <**ModuleItems**>
### ModuleItems _extends_ [Items](#items-extends-array)
### ModuleItem _extends_ [Item](#item)

### Pages _extends_ [Items](#items-extends-array)
### Page _extends_ [Item](#item)

### Quizzes _extends_ [Items](#items-extends-array)
### Quiz _extends_ [Item](#item)
- **`questions`** <**QuizQuestions**>
### QuizQuestions _extends_ [Items](#items-extends-array)
### QuizQuestion _extends_ [Item](#item)


## Item Gets and Sets
| Type | Title | Html | Url | Sub Items Lists |
|------------|-------|------|-----|------|
| Course | name | | /courses/<_course_> | files, assignments, discussions, modules, pages, quizzes |
| Assignment | name | description | html_url | |
| Discussion | title | message | html_url | |
| File | display_name |  | url | |
| Folder | name | | folders_url | |
| Module | name | | courses/<_course_>/modules#context_module_<_id_> | items |
| ModuleItem | title |  | html_url | |
| Page | title | body | html_url | |
| Quizzes | title | description | html_url | questions |
| QuizQuestion | question_name | question_text | courses/<_course_>/quizzes/<_quiz_>/edit#question_<_id_> | |

[Files]: #files-extends-items "Files"
[Folders]: #folders-extends-items "Folders"
[Assignments]: #assignments-extends-items "Assignments"
[Discussions]: #discussions-extends-items "Discussions"
[Modules]: #modules-extends-items "Modules"
[ModuleItems]: #moduleitems-extends-items "ModuleItems"
[Pages]: #pages-extends-items "Pages"
[Quizzes]: #quizzes-extends-items "Quizzes"
[QuizQuestions]: #quizquestions-extends-items "QuizQuestions"