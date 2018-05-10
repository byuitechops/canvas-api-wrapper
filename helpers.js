const util = require('util')
const canvas = require('./canvas')

class Course {
  constructor(id){
    if(id == undefined){
      throw new TypeError("Expected the id of the course")
    }
    this.files = new Files(id)
    this.assignments = new Assignments(id)
    this.discussions = new Discussions(id)
    this.modules = new Modules(id)
    this.pages = new Pages(id)
    this.quizzes = new Quizzes(id)
  }
}

/**
 * An abstract class which acts as a container for the different types of items
 * @public   @prop {number} course - the id of the course
 * @public   @prop {array}  items - the list of items it contains (only initalized after get functions)
 * @private @abstract @prop {Class}  childClass - the class used for the children
 */
class Items extends Array{
  constructor(id){
    if(id == undefined){
      throw new TypeError("Items expected the id of the course")
    }
    super()
    this.course = id
    Object.defineProperty(this,'childClass',{
      writable:true,
      enumerable:false
    })
  }
  /**
   * Not really sure what this line does, 
   * but it makes things not mess up as badly when doing slice and such
   * ( doing slice on this class returns just the array of sub items without this class wrapping it )
   */
  static get [Symbol.species]() { return Array; }
  /**
   * Constructs an instance of the child class
   * @private
   * @param {number} id
   * @return {Item}
   */
  _constructItem(id){
    if(!this.childClass){
      throw new TypeError("Classes extending the Items class needs childClass defined")
    }
    return new this.childClass(this.course,id)
  }
  /**
   * Creates an instance of the child class and assigns it the data passed
   * @private
   * @param {Object} data 
   * @return {Item}
   */
  _classify(data){
    var item = this._constructItem(data[this.childClass.idProp])
    item.setData(data)
    return item
  }
  /**
   * Updates all of the items
   * @async
   * @param {Function} [callback] - If not specified, returns a promise
   */
  async updateAll(callback=undefined){
    if(callback){return util.callbackify(this.updateAll.bind(this))(...arguments)}

    await Promise.all(this.map(item => item.update())) 
  }
  /**
   * Creates an Item
   * @async
   * @param {Object} data - The properties used to create the item
   * @param {Function} [callback] - If not specified, returns a promise 
   */
  async create(data, callback=undefined){

    if(callback){return util.callbackify(this.create.bind(this))(...arguments)}

    var item = this._constructItem()
    item.setData(data)
    await item.create()
    this.push(item)
    return item
  }
  /**
   * Retrieves all of the items from canvas
   * @async
   * @param {function} [callback] - If not specified, returns a promise 
   */
  async getAll(includeSub=false,callback=undefined){
    if(typeof inclueSub == 'function'){
      callback = includeSub
      includeSub = false
    }
    if(callback){return util.callbackify(this.getAll.bind(this))(...arguments)}

    var data = await canvas(this._constructItem().getPath(false))
    data.forEach(datum => {
      var item = this._classify(datum)
      this.push(item)
    })
    if(includeSub){
      await Promise.all(this.map(async item => {
        await Promise.all(item._subs.map(async key => {
          await item[key].getAll(true)
        }))
      }))
    }
    return this
  }
  /**
   * Retrieves a single item from canvas
   * @async
   * @param {number} id - The id of the item to get
   * @param {function} [callback] - If not specified, returns a promise 
   */
  async getOne(id,includeSub=false,callback=undefined){
    if(typeof inclueSub == 'function'){
      callback = includeSub
      includeSub = false
    }
    if(callback){return util.callbackify(this.getOne.bind(this))(...arguments)}

    var item = this._constructItem(id)
    await item.get()
    if(includeSub){
      await Promise.all(item._subs.map(async key => {
        await item[key].getAll(true)
      }))
    }
    this.push(item)
    return item
  }
  /**
   * Removes an item from canvas, and from the local list
   * @async
   * @param {number} id - The id of the item to delete
   * @param {function} [callback] If not specified, returns a promise 
   */
  async delete(id,callback=undefined){
    if(callback){return util.callbackify(this.delete.bind(this))(...arguments)}

    var foundIndex = this.findIndex(n => n.getId() == id)
    if(foundIndex == -1) throw new Error("Can't delete an item that does not exist");

    await this[foundIndex].delete()

    this.splice(foundIndex,1)
  }
}

/**
 * An abstract class for the different types of items to inherit from
 * @private @prop {number} _course - the id of the course
 * @private @prop {number} _id - the id of the item
 * @private @prop {string} _original - the original values from canvas stringified
 * @private @abstract @prop {array} _subs - the property names of the sub items
 * @private @abstract @prop {string} _post - the name of the property to wrap the data in if any 
 * @private @abstract @prop {string} _path - the path used to create the url
 * @private @abstract @prop {string} _html - the property name to access the html of the object
 * @private @abstract @prop {string} _title - the property name to access the title of the object
 */
class Item {
  constructor(course,id){
    Object.defineProperties(this,{
      _course:{
        value:course
      },
      _id: {
        value:id,
        writable: true,
      },
      _original: { 
        value: '{}',
        writable: true 
      },
      _subs: { 
        value: [],
        writable: true 
      },
      _post: { writable: true },
      _path: { writable: true },
      _html: { writable: true },
      _title: { writable: true },
    })
  }
  static get idProp(){ return 'id' }
  /**
   * Set the data of the item
   *  - purges the old data
   *  - sets the _original
   * @private
   * @param {Object} data 
   */
  setData(data){
    // Purge all of the old data
    for(var prop in this){
      if(this.hasOwnProperty(prop) && Object.getOwnPropertyDescriptor(this,prop).configurable){
        delete this[prop]
      }
    }
    // Save the data
    Object.assign(this,data)
    this._original = JSON.stringify(this)
  }
  /**
   * Creates the post body, wraping it if _post is specified
   * @private
   * @return {Object} - postbody
   */
  getPostbody(){
    var top = {}
    var postbody = this._post ? top[this._post] = {} : top
    Object.assign(postbody,this)
    return top
  }
  /**
   * Creates the url with the internal ids, dosen't specify last id if asked
   * @private
   * @param {boolean} includeId 
   * @return {string} - path
   */
  getPath(includeId=true){
    if(!this._path){
      throw new TypeError("Classes extending the Item class needs _path defined")
    }
    return `/api/v1/courses/${this._course}/${this._path}/${includeId ? this._id : ''}`
  }
  /** @return {string} - item's html */
  getHtml(){
    if(!this._html){
      throw new TypeError("Class extending the Item class did not define a _html property")
    }
    return this[this._html]
  }
  /** @param {string} - item's html */
  setHtml(val){ 
    if(!this._html){
      throw new TypeError("Class extending the Item class did not define a _html property")
    }
    this[this._html] = val 
  }
  /** @return {string} - item's title */
  getTitle(){ 
    if(!this._title){
      throw new TypeError("Class extending the Item class did not define a _title property")
    }
    return this[this._title] 
  }
  /** @param {string} - item's title */
  setTitle(val){ 
    if(!this._title){
      throw new TypeError("Class extending the Item class did not define a _title property")
    }
    this[this._title] = val 
  }
  /** @return {string} - item's id */
  getId(){ return this._id }
  /**
   * Checks to see if this item's properties have changed since the last setData
   * @private
   * @return {boolean}
   */
  hasChanged(){ 
    return JSON.stringify(this) != this._original 
  }
  /**
   * Retrieves this item's data from canvas
   * @async
   * @param {function} [callback] If not specified, returns a promise 
   * @return {Item} this
   */
  async get(callback=undefined){
    // Fancy boilerplate to recursivly callbackify if there is a callback
    if(callback){return util.callbackify(this.get.bind(this))(...arguments)}
    var data = await canvas(this.getPath())
    this.setData(data)
  }
  /**
   * Posts this item's data to canvas
   * @async
   * @param {function} [callback] If not specified, returns a promise 
   */
  async update(callback=undefined){
    // If nothing has changed then don't bother
    if(!this.hasChanged()) return;
    if(callback){return util.callbackify(this.update.bind(this))(...arguments)}
    var data = await canvas(this.getPath(),{
      method: 'PUT',
      body: this.getPostbody()
    })
    this.setData(data)
  }
  /**
  * Deletes the item from canvas
  * @async
  * @param {function} [callback] If not specified, returns a promise 
  */
  async delete(callback=undefined){
    if(callback){return util.callbackify(this.delete.bind(this))(...arguments)}

    var data = await canvas(this.getPath(),{
      method:'DELETE'
    })
    this.setData(data)
  }
  /**
   * Creates the item in canvas, with whatever properties it contains
   * @async
   * @param {function} [callback] If not specified, returns a promise 
   */
  async create(callback=undefined){
    if(callback){return util.callbackify(this.create.bind(this))(...arguments)}

    var data = await canvas(this.getPath(false),{
      method:'POST',
      body: this.getPostbody()
    })
    this.setData(data)
    this._id = data.id
    return this
  }
}

/***********************
* Assignments
************************/
class Assignments extends Items {
  constructor(id){
    super(id)
    this.childClass = Assignment
  }
}
class Assignment extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'assignments'
    this._post = 'assignment'
    this._title = 'name'
    this._html = 'description'
  }
}
/***********************
* Discussions
************************/
class Discussions extends Items {
  constructor(id){
    super(id)
    this.childClass = Discussion
  }
}
class Discussion extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'discussion_topics'
    this._title = 'title'
    this._html = 'message'
  }
}
/***********************
* Files
************************/
class Files extends Items {
  constructor(id){
    super(id)
    this.childClass = File
    this.create = undefined
  }
}
class File extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'files'
    this._title = 'display_name'
    this.create = undefined
  }
  setTitle(value){
    super.setTitle(value)
    this.name = value
  }
}
/***********************
* Modules
************************/
class Modules extends Items {
  constructor(id){
    super(id)
    this.childClass = Module
  }
}
class Module extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'modules'
    this._post = 'module'
    this._title = 'name'
    this._subs = ['items']
    Object.defineProperty(this,'items',{
      value:new ModuleItems(course,id),
      enumerable:true,
    })
  }
}
class ModuleItems extends Items {
  constructor(courseId,moduleId){
    super(courseId)
    this.module = moduleId
    this.childClass = ModuleItem
  }
  _constructItem(id){
    return new ModuleItem(this.course,this.module,id)
  }
}
class ModuleItem extends Item {
  constructor(course,module,id){
    super(course,id)
    Object.defineProperty(this,'_module',{value:module})
    this._path = `modules/${this._module}/items`
    this._post = 'module_item'
    this._title = 'title'
  }
}
/***********************
* Pages
************************/
class Pages extends Items {
  constructor(id){
    super(id)
    this.childClass = Page
  }
  // Need to add fix for getting the body if requested
  async getAll(includeSub,callback){
    await super.getAll(false,callback)
    if(includeSub){
      var singleyGotten = await Promise.all(this.map(async page => this.getOne(page.getId())))
      this.length = 0
      singleyGotten.forEach(page => this.push(page))
    }
  }
}
class Page extends Item {
  static get idProp(){ return 'page_id'}
  constructor(course,id){
    super(course,id)
    this._path = 'pages'
    this._post = 'wiki_page'
    this._title = 'title'
    this._html = 'body'
  }
}
/***********************
* Quizzes
************************/
class Quizzes extends Items {
  constructor(id){
    super(id)
    this.childClass = Quiz
  }
}
class Quiz extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'quizzes'
    this._post = 'quiz'
    this._title = 'title'
    this._html = 'description'
    this._subs = ['questions']
    Object.defineProperty(this,'questions',{
      value: new QuizQuestions(course,this.getId()),
      enumerable:true
    })
  }
}
class QuizQuestions extends Items {
  constructor(courseId,quizId){
    super(courseId)
    this.childClass = Quiz
    this.quiz = quizId
  }
  _constructItem(id){
    return new QuizQuestion(this.course,this.quiz,id)
  }
}
class QuizQuestion extends Item {
  constructor(course,quiz,id){
    super(course,id)
    Object.defineProperty(this,'_quiz',{value:quiz,writable:false})
    this._path = `quizzes/${this._quiz}/questions`
    this._post = 'question'
    this._title = 'question_name'
    this._html = 'question_text'
  }
}

// All of this file's exports will be added to the main canvas object
module.exports.getCourse = function getCourse(id){
  return new Course(id)
}