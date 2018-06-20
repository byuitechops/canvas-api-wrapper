const canvas = require('../main')
const ejs = require('ejs')
const fs = require('fs')
const path = require('path')
canvas.subdomain = 'subdomain'

const classes = []

function document(item){
  if(classes.find(n => n.type == item.getType())){ return }
  var documentation = {
    type:item.getType(),
    name:item.getType().toLowerCase(),
    methods:[{
      method:'getType()',
      result:`"${item.getType()}"`
    },{
      method:'getId()',
      prop:item._idProp
    },{
      method:'getParentIds()',
      result:`[${item.getParentIds().toString()}]`,
    },item._title && {
      method:'[get/set]Title()',
      prop:item._title,
    },item._html && {
      method:'[get/set]Html()',
      prop:item._html,
    },{
      method:'getPath()',
      result:item.getPath()
    },{
      method:'getPath(false)',
      result:item.getPath(false)
    },item._url && {
      method:'getUrl()',
      [item._url.includes('http')?'result':'prop']:item._url.replace('subdomain','<subdomain>')
    }].filter(n => n),
    children:item._subs.map(n => ({name:n,type:item[n].childClass.name}))
  }
  classes.push(documentation)
  item._id = ':'+item.getType().toLowerCase()
  item.getSubs().forEach(sub => {
    sub.ids[sub.ids.length-1] = item._id
    document(sub._constructItem(':id'))
  })
}

document(canvas.getCourse(':id'))
var mermaid = ejs.render(fs.readFileSync(path.resolve(__dirname,'diagram.ejs'),'utf-8'),{classes:classes})
fs.writeFileSync(path.resolve(__dirname,'diagram.mmd'),mermaid)
var markdown = ejs.render(fs.readFileSync(path.resolve(__dirname,'classes.ejs'),'utf-8'),{classes:classes})
fs.writeFileSync(path.resolve(__dirname,'classes.md'),markdown)