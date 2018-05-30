const api = require('./api')
const Items = require('./ItemsClass')
const Item = require('./ItemClass')
const canvas = require('./canvas')
const url = require('url')

/**
 * Creates a class which inherits from the Item class and has a constructor
 * which implements the settings found in the settings object. Also passed
 * in is the name which is used to title the class
 * @param {string} name 
 * @param {object} settings 
 */
function createItemClass(name,settings){
  // Checking our required parameters
  if(settings.path === undefined){
    throw new TypeError("path needs to be defined in the settings")
  }
  // Setting all of the defaults
  settings.path = Array.isArray(settings.path) ? settings.path : [settings.path]
  settings.children = settings.children || []
  settings.children = Array.isArray(settings.children) ? settings.children : [settings.children]
  settings.id = settings.id != undefined ? settings.id : 'id'
  // The constructor for the new class
  function item(ids){
    if(ids == undefined){
      throw new TypeError('Needs to be created with the ids')
    }
    // Resolving the functions in the settings
    if(typeof settings.path[0] == 'function'){
      settings.path[0] = settings.path[0](ids)
    }
    if(typeof settings.url == 'function'){
      settings.url = url.resolve(`https://${canvas.subdomain}.instructure.com`,settings.url(ids))
    }
    // Defining all of the private properties
    Object.defineProperties(this,{
      _course:{ value:ids[0] },
      _id: {
        value:ids[ids.length-1],
        writable: true,
      },
      _original: { writable: true },
      _subs: { value: settings.children.map(child => child.name) },
      _path: { value: settings.path },
      _post: { value: settings.postbody },
      _html: { value: settings.html },
      _title: { value: settings.title },
      _url: { value: settings.url },
      _listeners: { value: {} },
      _idProp: {value: settings.id }
    })
    // Defining all of the children
    Object.defineProperties(this,settings.children.reduce((obj,child) => {
      var Class = createItemsClass(child)
      obj[child.name] = {
        value: new Class(ids),
        enumerable:true
      }
      return obj
    },{}))
  }
  // Making our function inherit from the Item class
  item.prototype = Object.create(Item.prototype)
  item.prototype.constructor = item
  Object.assign(item.prototype,settings.custom)
  // Setting the name of the class
  Object.defineProperty(item,'name',{
    value: name.slice(0,1).toUpperCase() + name.slice(1)
  })
  return item
}

/**
 * Creates a class which inherits from the Items class
 * @param {string} name - what the class should be named
 * @param {string} type - the name of it's children type
 */
function createItemsClass({name,type}){
  function items(ids){
    if(ids == undefined){
      throw new TypeError('Needs to be created with the ids')
    }
    Array.call(this)
    Object.defineProperties(this,{
      childClass:{ value:createItemClass(type,api[type]) },
      ids:{ value: ids }
    })
  }
  items.prototype = Object.create(Items.prototype)
  items.prototype.constructor = items
  Object.defineProperty(items,'name',{
    value: name.slice(0,1).toUpperCase() + name.slice(1)
  })
  return items
}

// Creating the Course class for when they ask for it
const Course = createItemClass('course',api.course)

module.exports.getCourse = function getCourse(id){
  if(id == undefined){
    throw new TypeError("Expected the id of the course")
  }
  var course = new Course([id])
  return course
}