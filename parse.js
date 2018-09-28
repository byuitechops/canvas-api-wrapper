/**
 * Parse the object if they use weird keys
 * @param {object} data 
 */
module.exports = function parse(data){
  return Object.entries(data).reduce((obj,[key,value]) => {
    var keys = key.replace(/]/g,'').split('[').map(n => n==''?0:n)
    if(keys[keys.length-1] == '0' && Array.isArray(value)) keys.pop()
    var node = keys.slice(0,-1).reduce((node,key,i) => node[key] = node[key] || (isNaN(keys[i+1])?{}:[]),obj)
    node[keys[keys.length-1]] = value
    return obj
  },{})
}
