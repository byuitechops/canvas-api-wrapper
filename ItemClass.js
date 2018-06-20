const util = require('util')
const canvas = require('./canvas')
const parse = require('./parse')

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
module.exports = class Item {
  /**
   * Attach event listener, don't really know when you would use
   * these so they aren't documented. I only needed them so that 
   * the Parent Items knows if it got deleted independently
   * @param {string} event 
   * @param {function} func 
   */
  on(event,func){
    if(typeof event != 'string'){
      throw TypeError("Event label needs to be a string")
    }
    if(typeof func != 'function'){
      throw TypeError("Event handler needs to be a function")
    }
    this._listeners[event] = this._listeners[event] || []
    this._listeners[event].push(func)
  }
  /**
   * Called when I'm sending an event
   * @private
   * @param {string} event 
   */
  send(event){
    if(typeof event != 'string'){
      throw TypeError("Event label needs to be a string")
    }
    if(this._listeners[event]){
      this._listeners[event].forEach(func => func(this))
    }
  }
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
    if(data[this._idProp] != undefined){
      this._id = data[this._idProp]
      this.getSubs().forEach(sub => {
        if(sub.ids[sub.ids.length-1] != this._id){
          sub.ids.push(this._id)
        }
      })
    }
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
    this._subs.forEach(key => {
      delete postbody[key]
    })
    return top
  }
  /**
   * Creates the url with the internal ids, dosen't specify last id if asked
   * @private
   * @param {boolean} includeId 
   * @return {string} - path
   */
  getPath(individual=true){
    if(!this._path){
      throw new TypeError("Class extending the Item class doesn't have path defined")
    }
    let path = this._path, includeCourse=true
    if(typeof this._path == 'function'){
      path = path(this._parents,individual)
    }
    if(Array.isArray(path)){
      [path,includeCourse=true] = path
    }
    return [
      '/api/v1',
      includeCourse && 'courses/'+this._parents[0],
      path.replace(/^\/|\/$/g,''),
      individual && String(this._id)
    ].filter(n => n).join('/')
  }
  /** @return {string} - item's html */
  getHtml(){
    if(this._html){
      return this[this._html] || ""
    } else {
      return undefined
    }
  }
  /** @param {string} - item's html */
  setHtml(val){ 
    if(!this._html){
      throw new TypeError("Class extending the Item class doesn't have a html property defined")
    }
    this[this._html] = val
  }
  /** @return {string} - item's title */
  getTitle(){
    if(this._title){
      return this[this._title] || ""
    } else {
      return undefined
    }
  }
  /** @param {string} - item's title */
  setTitle(val){ 
    if(!this._title){
      throw new TypeError("Class extending the Item class doesn't have a title property defined")
    }
    this[this._title] = val 
  }
  /** @return {string} - item's Url */
  getUrl(){
    if(this._url.includes('http')){
      return this._url
    } else {
      return this[this._url]
    }
  }
  /** @return {string} - name of this class */
  getType(){
    return this.constructor.name
  }
  /** @return {string} - item's id */
  getId(){ return this._id }
  /** @return {[Items]} - array of subs */
  getSubs(){
    return this._subs.map(key => this[key])
  }
  /** @return {string} */
  getType(){
    return this.constructor.name
  }
  /**
   * @private
   * @return {object} - this object with out it's children
   */
  toJSON() {
    var temp = Object.assign({},this)
    this._subs.forEach(key => delete temp[key])
    return temp
  }
  /**
   * Checks to see if this item's properties have changed since the last setData
   * @private
   * @return {false || Array[thisChanged,childrenChanged]}
   */
  getChanged(){
    return [
      this._original != undefined && JSON.stringify(this) != this._original,
      this.getSubs().some(sub => sub.hasChanged()),
    ]
  }
  /**
   * Returns a flat list of all children and their children
   */
  getFlattened(depth=1){
    return this.getSubs().reduce((arr,children) => arr.concat(children.getFlattened(depth-1)),depth <= 0 ? [this] : [])
  }
  /**
   * Retrieves all of the sub items, and their sub items
   * @private
   */
  async getSub(){
    await Promise.all(this.getSubs().map(sub => sub.getComplete()))
    // reset the has changed
    this._original = JSON.stringify(this)
  }
  /**
   * Retrieves this item's data from canvas
   * @async
   * @param {function} [callback] If not specified, returns a promise 
   * @return {Item} this
   */
  async get(query=undefined,callback=undefined){
    // Backwards compatability
    if(typeof query == 'boolean'){
      if(query == true){
        return this.getComplete(callback)
      }
      query = undefined
    } else if(typeof query == 'function'){
      callback = query
      query = undefined
    }

    // Fancy boilerplate to recursivly callbackify if there is a callback
    if(callback){return util.callbackify(this.get.bind(this))(...arguments)}
    
    var data = await canvas(this.getPath(),query)
    
    this.setData(data)
    this.send('get')

    return this
  }
  /**
   * Retrieves this item from canvas and all of it's sub items
   * @async
   * @param {function} [callback] If not specified, returns a promise 
   * @return {Item} this
   */
  async getComplete(callback=undefined){
    if(callback){return util.callbackify(this.getComplete.bind(this))(...arguments)}

    await this.get()
    await this.getSub()
    this.send('getComplete')

    return this
  }
  /**
   * Posts this item's data to canvas
   * @async
   * @param {function} [callback] If not specified, returns a promise 
   */
  async update(alternateBody=undefined,callback=undefined){
    if(typeof alternateBody == 'function'){
      callback = alternateBody
      alternateBody = undefined
    }
    if(callback){return util.callbackify(this.update.bind(this))(...arguments)}
    
    // If they specify an alternate body then always post 
    // regaurdless of whether things have actually changed
    if(alternateBody){
      alternateBody = parse(alternateBody)
      if(this._post && !alternateBody[this._post]){
        alternateBody = {[this._post]:alternateBody}
      }
      var data = await canvas.put(this.getPath(),alternateBody)
      this.setData(data)
    } else {
      // If nothing has changed then don't bother
      var [thisChanged,childrenChanged] = this.getChanged()
      if(thisChanged){
        var data = await canvas.put(this.getPath(),this.getPostbody())
        this.setData(data)
      }
      if(childrenChanged){
        // Update all of the children as well
        await Promise.all(this.getSubs().map(sub => sub.update()))
      }
    }
    this.send('update')
  }
  /**
  * Deletes the item from canvas
  * @async
  * @param {function} [callback] If not specified, returns a promise 
  */
  async delete(query=undefined,callback=undefined){
    if(typeof query == 'function'){
      callback = query
      query = undefined
    }
    if(callback){return util.callbackify(this.delete.bind(this))(...arguments)}
    var data = await canvas.delete(this.getPath(),query)
    this.setData(data)
    this.send('delete')
  }
  /**
   * Creates the item in canvas, with whatever properties it contains
   * @async
   * @private - Use Items.create instead
   */
  async create(){
    var data = await canvas.post(this.getPath(false),this.getPostbody())
    this.setData(data)
    this.getSubs().forEach(sub => sub.parentId = this._id)
    this.send('create')
    return this
  }
}