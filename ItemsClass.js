const util = require('util')
const canvas = require('./canvas')

/**
 * An abstract class which acts as a container for the different types of items
 * @public   @prop {number} course - the id of the course
 * @public   @prop {array}  items - the list of items it contains (only initalized after get functions)
 * @private @abstract @prop {Class}  childClass - the class used for the children
 */
module.exports = class Items extends Array{
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
   * Any of the childern have changed
   */
  hasChanged(){
    return this.some(item => item.hasChanged())
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
      await Promise.all(this.map(item => item.getSub()))
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
    await item.get(includeSub)
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