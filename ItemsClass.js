const util = require('util')
const canvas = require('./canvas')

/**
 * Parse the object if they use weird keys
 * @param {object} data 
 */
function parse(data){
  return Object.entries(data).reduce((obj,[key,value]) => {
    var keys = key.replace(/]/g,'').split('[').map(n => n==''?0:n)
    var node = keys.slice(0,-1).reduce((node,key,i) => node[key] = node[key] || (isNaN(keys[i+1])?{}:[]),obj)
    node[keys[keys.length-1]] = value
    return obj
  },{})
}

/**
 * An abstract class which acts as a container for the different types of items
 * @public  @prop {number} course - the id of the course
 * @public  @prop {array}  items - the list of items it contains (only initalized after get functions)
 * @private @abstract @prop {Class}  childClass - the class used for the children
 */
module.exports = class Items extends Array{
  constructor(id){
    if(id == undefined){
      throw new TypeError("Items expected the id of the course")
    }
    super()
    Object.defineProperties(this,{
      childClass:{
        writable:true,
      },
      course:{
        writable:true,
        value:id
      },
      parentId:{
        writable:true,
      }
    })
  }
  /**
   * Not really sure what this line does, 
   * but it makes things not mess up as badly when doing slice and such
   * ( doing slice on this class returns just the array of sub items without this class wrapping it )
   */
  static get [Symbol.species]() { return Array; }
  /**
   * Attaches the delete event listener, so that we can remove it from the list if it
   * get removed independently
   * @param {Item} item 
   */
  _attachListeners(item){
    item.on('delete',item => {
      var foundIndex = this.findIndex(n => n.getId() == item.getId())
      if(foundIndex != -1){
        this.splice(foundIndex,1)
      }
    })
  }
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
    var item = new this.childClass(this.course,id)
    this._attachListeners(item)
    return item
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
   * Any of the childern have changed
   */
  hasChanged(){
    return this.some(item => {
      var [thisChanged,childrenChanged] = item.getChanged()
      return thisChanged || childrenChanged
    })
  }
  /**
   * Updates all of the items
   * @async
   * @param {Function} [callback] - If not specified, returns a promise
   */
  async update(callback=undefined){
    if(callback){return util.callbackify(this.update.bind(this))(...arguments)}

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
    data = parse(data)
    data = data[item._post] || data
    item.setData(data)
    await item.create()
    this.push(item)
    return item
  }
  /**
   * Retrieves all of the items
   * @async
   * @param {function} [callback] - If not specified, returns a promise 
   */
  async get(callback=undefined){
    if(callback){return util.callbackify(this.get.bind(this))(...arguments)}

    var data = await canvas(this._constructItem().getPath(false))
    data.forEach(datum => {
      var item = this._classify(datum)
      var existing = this.find(n => n.getId() == item.getId())
      if(existing){
        existing.setData(datum)
      } else {
        this.push(item)
      }
    })
    return this
  }
  /**
   * Retrieves all of the items with their sub items
   * @async
   * @param {function} [callback] - If not specified, returns a promise 
   */
  async getComplete(callback=undefined){
    if(callback){return util.callbackify(this.getComplete.bind(this))(...arguments)}
    await this.get()
    await Promise.all(this.map(item => item.getSub()))
    return this
  }
  /**
   * Retrieves a single item from canvas
   * @async
   * @param {number} id - The id of the item to get
   * @param {function} [callback] - If not specified, returns a promise 
   */
  async getOne(id,callback=undefined){
    if(callback){return util.callbackify(this.getOne.bind(this))(...arguments)}
    
    var existing = this.find(n => n.getId() == id)
    if(existing){
      await existing.get()
      return existing
    } else {
      var item = this._constructItem(id)
      await item.get()
      this.push(item)
      return item
    }
  }
  async getOneComplete(id,callback=undefined){
    if(callback){return util.callbackify(this.getOneComplete.bind(this))(...arguments)}
    
    var item = await this.getOne(id)
    await item.getSub()
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
    if(foundIndex != -1){
      await this[foundIndex].delete()
      // Might already be removed because of the event listeners
      foundIndex = this.findIndex(n => n.getId() == id)
      if(foundIndex != -1){
        this.splice(foundIndex,1)
      }
    } else {
      var temp = this._constructItem(id)
      temp.delete()
    }
  }
}