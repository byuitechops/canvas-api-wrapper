## Super simple to use
This module wraps the [Canvas Api](https://canvas.instructure.com/doc/api/all_resources.html) handling pagination and throttling. Giving easy access to the main CRUD operations, and making the other more specific calls easier as well.
``` js
// Example: Publish all Modules
const canvas = require('canvas-api-wrapper')
canvas.domain = 'example'

const course = canvas.getCourse(19284)

await course.modules.getAll()

course.modules.forEach(module => {
	module.published = true
})

await course.update()
```

## Table of contents
- [Get Started](#get-started)
- [Settings](#settings)
- [Standard Calls](#standard-calls)
- [Wrapped Calls](#wrapped-calls)
	- [Course](#course-extends-item)
	- [Items](#items-extends-array)
	- [Item](#item)
- [Item Gets and Sets](#item-gets-and-sets)

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

## Settings
This library handles all of the throttling, so that you won't go over your
rate limit. But you may want to tweek the settings to speed it up or slow it 
down
```js
// the subdomain under canvas 
//  https://<domain>.instructure.com
canvas.domain = 'byui';

// Canvas uses a rate-limit point system to handle spamming. Canvas
// fills your account to 700 'points' and subtracts from your 'points'
// every time you make a call. If you go below 0 then canvas will start
// sending you 403 (unauthorized) statuses or tell you that the servers
// are melting. So when your account goes under the 'rateLimitBuffer'
// this module will halt the requests until it gets filled back to 
// the 'rateLimitBuffer'. Give it a pretty large buffer, it tends to 
// go quite a ways past the buffer before I catch it.
canvas.rateLimitBuffer = 300;

// How many to send synchronously at the same time, the higher this
// number, the more it will go over your rateLimitBuffer
canvas.callLimit = 30;

// How much the calls are staggered (milliseconds) especially at the
// beginning so that it doesn't send the callLimit all at the same time
canvas.minSendInterval = 10;

// After it goes under the rateLimitBuffer, how often (in milliseconds) 
// to check what the buffer is at now, this should be pretty high because
// there will be a lot of threads checking at the same time.
canvas.checkStatusInterval = 2000;
```

## Standard Calls
Use awaits or the optional callback
```js
var modules = await canvas('/api/v1/courses/10698/modules')

canvas('/api/v1/courses/10698/modules', function(err,modules){
	if(err) {
		console.error(err);
		return 
	}
	console.log(modules)
})
```
Include post body under the `body` property in options
```js
await canvas.post('/api/v1/courses/10698/modules',{
	body:{
		module:{
			name:"New Module"
		}
	}
})
```
Also useful is the `query` property which will build the querystring from an object
``` js
var queriedModules = await canvas('/api/v1/courses/10698/modules',{
	query:{
		search_term:'New Module'
	}
})
```
See all documentation for the options parameter in the [got library](https://www.npmjs.com/package/got#user-content-api)

### Signatures
``` js
canvas(url[,options][,callback]) // uses a GET request

canvas.get(url[,options][,callback])

canvas.post(url[,options][,callback])

canvas.put(url[,options][,callback])

canvas.delete(url[,options][,callback])

canvas.getCourse(id)
```

## Wrapped Calls
The CRUD operations for files, folders, assignments, discussions, modules, pages, and quizzes are wrapped for convenience. The can be accessed through the [Course Class](#course-extends-item) which is created through `canvas.getCourse(id)`

### Course _extends_ [Item](#item)
 - `files` <[Files]>
 - `folders` <[Folders]>
 - `assignments` <[Assignments]>
 - `discussions` <[Discussions]>
 - `modules` <[Modules]>
 - `pages` <[Pages]>
 - `quizzes` <[Quizzes]>
 
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

- _async_ `updateAll( [callback] )`
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

- _async_ `create( data, [callback] )` <[Item](#item)>
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

- _async_ `getAll( [includeSub] [,callback]  )` <**[Item]**>
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

- _async_ `getOne( id, [includeSub] [,callback] )` <[Item](#item)>
	- Retrieves a single item from canvas by id
	- `id` <**number**> the id of the item to grab
	- `includeSub` <**Boolean**> Whether to also get the sub items such as `questions` in `quiz`. Defaults to `false`
``` js
const course = canvas.getCourse(19823)
const folder = course.folders.getOne(114166)
console.log(folder)
```
- _async_ `delete( id , [callback] )`
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

- `getId()` <**number**>
- `getTitle()` <**string**>
- `setTitle( title )`
- `getHtml()` <**string**>
- `setHtml( html )`
- `getUrl()` <**string**>
- _async_ `get( [includeSub] [,callback] )` <[Item](#item)>
	- Retrieves the item from canvas
	- `includeSub` <**Boolean**> Whether to also get the sub items such as `questions` in `quiz`. Defaults to `false`
- _async_ `update( [callback] )`
	- Only updates if properties have been changed on the Item since it was last gotten, also updates all of it's sub children who have been changed
- _async_ `delete( [callback] )`
	- Use the delete property on [Items](#items-extends-array) instead, to delete the local copy
- _async_ `create( [callback] )`
	- creates the item with all of it's current properties, use the create property on [Items](#items-extends-array) instead.

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
- `items` <**ModuleItems**>
### ModuleItems _extends_ [Items](#items-extends-array)
### ModuleItem _extends_ [Item](#item)

### Pages _extends_ [Items](#items-extends-array)
### Page _extends_ [Item](#item)

### Quizzes _extends_ [Items](#items-extends-array)
### Quiz _extends_ [Item](#item)
- `questions` <**QuizQuestions**>
### QuizQuestions _extends_ [Items](#items-extends-array)
### QuizQuestion _extends_ [Item](#item)


## Item Gets and Sets
| Type | getId | getTitle/setTitle | getHtml/setHtml | getUrl | Sub Items Lists _(The additional properties which contain subitems)_ |
|------------|-------|------|-----|------|---|
| Course | id | name | | /courses/<_course_> | files, folders, assignments, discussions, modules, pages, quizzes |
| Assignment | id | name | description | html_url | |
| Discussion | id | title | message | html_url | |
| File | id | display_name |  | /files/?preview=<_id_> | |
| Folder | id | name | | folders_url | |
| Module | id | name | | /modules#context_module_<_id_> | items |
| ModuleItem | id | title |  | html_url | |
| Page | page_id | title | body | html_url | |
| Quizzes | id | title | description | html_url | questions |
| QuizQuestion | id | question_name | question_text | /quizzes/<_quiz_>/edit#question_<_id_> | |

[Files]: #files-extends-items "Files"
[Folders]: #folders-extends-items "Folders"
[Assignments]: #assignments-extends-items "Assignments"
[Discussions]: #discussions-extends-items "Discussions"
[Modules]: #modules-extends-items "Modules"
[ModuleItems]: #moduleitems-extends-items "ModuleItems"
[Pages]: #pages-extends-items "Pages"
[Quizzes]: #quizzes-extends-items "Quizzes"
[QuizQuestions]: #quizquestions-extends-items "QuizQuestions"