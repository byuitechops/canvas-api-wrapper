const util = require('util')
const canvas = require('./canvas')

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
  constructor(course,id){
    Object.defineProperties(this,{
      _course:{
        value:course
      },
      _id: {
        value:id,
        writable: true,
      },
      _original: { writable: true },
      _subs: { 
        value: [],
        writable: true 
      },
      _post: { writable: true },
      _path: { writable: true },
      _html: { writable: true },
      _title: { writable: true },
      _url: { writable: true },
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
  getPath(includeId=true){
    if(!this._path){
      throw new TypeError("Class extending the Item class doesn't have path defined")
    }
    return `/api/v1/courses/${this._course}/${this._path}/${includeId ? this._id : ''}`
  }
  /** @return {string} - item's html */
  getHtml(){
    if(!this._html){
      throw new TypeError("Class extending the Item class doesn't have a html property defined")
    }
    return this[this._html] || ""
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
    if(!this._title){
      throw new TypeError("Class extending the Item class doesn't have a title property defined")
    }
    return this[this._title] || ""
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
    if(!this._url){
      throw new TypeError("Class extending the Item class doesn't have a url property defined")
    }
    if(this._url.includes('http')){
      return this._url
    } else {
      return this[this._url]
    }
  }
  /** @return {string} - item's id */
  getId(){ return this._id }
  /** @return {[Items]} - array of subs */
  getSubs(){
    return this._subs.map(key => this[key])
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
  async get(callback=undefined){
    // Fancy boilerplate to recursivly callbackify if there is a callback
    if(callback){return util.callbackify(this.get.bind(this))(...arguments)}
    
    var data = await canvas(this.getPath())
    
    this.setData(data)

    return this
  }
  /**
   * Retrieves this item from canvas and all of it's sub items
   * @async
   * @param {function} [callback] If not specified, returns a promise 
   * @return {Item} this
   */
  async getComplete(callback=undefined){
    await this.get()
    await this.getSub()
    return this
  }
  /**
   * Posts this item's data to canvas
   * @async
   * @param {function} [callback] If not specified, returns a promise 
   */
  async update(callback=undefined){
    if(callback){return util.callbackify(this.update.bind(this))(...arguments)}
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
  /**
  * Deletes the item from canvas
  * @async
  * @param {function} [callback] If not specified, returns a promise 
  */
  async delete(callback=undefined){
    if(callback){return util.callbackify(this.delete.bind(this))(...arguments)}

    var data = await canvas.delete(this.getPath())
    this.setData(data)
  }
  /**
   * Creates the item in canvas, with whatever properties it contains
   * @async
   * @param {function} [callback] If not specified, returns a promise 
   */
  async create(callback=undefined){
    if(callback){return util.callbackify(this.create.bind(this))(...arguments)}

    var data = await canvas.post(this.getPath(false),this.getPostbody())
    this.setData(data)
    this._id = data.id
    return this
  }
}