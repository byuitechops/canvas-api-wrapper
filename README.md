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
### class: Course
The main Class which contains all the items
 - `files` <[Files]>
 - `assignments` <[Assignments]>
 - `discussions` <[Discussions]>
 - `modules` <[Modules]>
 - `pages` <[Pages]>
 - `quizzes` <[Quizzes]>

### class: Items
The abstract class which all of the lists of items inherit from
- `course` <[number]> the id of the course
- `items` <[Array]<[Item]>> the array of children, only comes after 

#### items.updateAll(callback<sub>_opt_</sub>)
- returns <[Promise]<>>

Updates all of the items, if any changes have been made to them

#### items.create(data,callback<sub>_opt_</sub>)
- `data` <[Object]> the properties to add to the created item
- returns <[Promise]<[Item]>>

Creates the item in canvas, with the given data. And adds it to the items property

#### items.getAll(callback<sub>_opt_</sub>)
- returns <[Promise]<[Array]<[Items]>>>

Retrieves all of the children items from canvas

#### items.getOne(id,callback<sub>_opt_</sub>)
- `id` <[number]> the id of the item to grab
- returns <[Promise]<[Item]>>

Retrieves a single item from canvas by id

#### items.delete(id,callback<sub>_opt_</sub>)
- `id` <[number]> the id of the item to delete
- returns <[Promise]<[Item]>>

Removes an item from canvas, and from the local list

### class: Item
The abstract class for the items to inherit from

#### item.getId()
- returns <[number]>

#### item.getTitle()
- returns <[string]>

#### item.setTitle(title)
- `title` <[string]>

#### item.getHtml()
- returns <[string]>

#### item.setHtml(html)
- `html` <[string]>

#### item.get(callback<sub>_opt_</sub>)
- returns <[Promise]<>>

#### item.update(callback<sub>_opt_</sub>)
- returns <[Promise]<>>

Only updates if properties have been changed on the Item since it was last gotten

#### item.delete(callback<sub>_opt_</sub>)
- returns <[Promise]<>>

Use the delete property on [Items] instead

#### item.create(callback<sub>_opt_</sub>)
- returns <[Promise]<>>

creates the item with all of it's current properties

### class: Assignments
- extends: [`Items`](#class-items)
- `items` <[Array]<[Assignment]>>

### class: Assignment
- extends: [`Item`](#class-item)

### class: Discussions
- extends: [`Items`](#class-items)
- `items` <[Array]<[Discussion]>>

### class: Discussion
- extends: [`Item`](#class-item)

### class: Files
- extends: [`Items`](#class-items)
- `items` <[Array]<[File]>>

Doesn't have a create method 

### class: File
- extends: [`Item`](#class-item)

Doesn't have a create method 

### class: Modules
- extends: [`Items`](#class-items)
- `items` <[Array]<[Module]>>

### class: Module
- extends: [`Item`](#class-item)
- `items` <[ModuleItems]> 

### class: ModuleItems
- extends: [`Items`](#class-items)
- `items` <[Array]<[ModuleItem]>>

### class: ModuleItem
- extends: [`Item`](#class-item)

### class: Pages
- extends: [`Items`](#class-items)
- `items` <[Array]<[Page]>>

### class: Page
- extends: [`Item`](#class-item)

### class: Quizzes
- extends: [`Items`](#class-items)
- `items` <[Array]<[Quiz]>>

### class: Quiz
- extends: [`Item`](#class-item)
- `questions` <[QuizQuestions]>

### class: QuizQuestions
- extends: [`Items`](#class-items)
- `items` <[Array]<[QuizQuestion]>>

### class: QuizQuestion
- extends: [`Item`](#class-item)

[Array]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array "Array"
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Boolean_type "Boolean"
[function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function "Function"
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#Number_type "Number"
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object "Object"
[Promise]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise "Promise"
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#String_type "String"
[Course]: #class-course "Course"
[Items]: #class-items "Items"
[Files]: #class-files "Files"
[Pages]: #class-pages "Pages"
[Quizzes]: #class-quizzes "Quizzes"
[Modules]: #class-modules "Modules"
[Assignments]: #class-assignments "Assignments"
[Discussions]: #class-discussions "Discussions"
[ModuleItems]: #class-moduleitems "ModuleItems"
[QuizQuestions]: #class-quizquestions "QuizQuestions"

[Item]: #class-item "Item"
[File]: #class-file "File"
[Page]: #class-page "Page"
[Quiz]: #class-quiz "Quiz"
[Module]: #class-module "Module"
[Assignment]: #class-assignment "Assignment"
[Discussion]: #class-discussion "Discussion"
[ModuleItem]: #class-moduleitem "ModuleItem"
[QuizQuestion]: #class-quizquestion "QuizQuestion"
