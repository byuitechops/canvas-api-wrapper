const assert = require('better-assert')
const canvas = require('../main')
const api = require('../api')
const course = canvas.getCourse(11310)

var tests = {
  assignment: {
    create: { name: 'test title' },
    update: { name: 'updated title' },
    parent: course.assignments
  },
  override:{
    create: { student_ids: [43], title: 'test title' },
    update: { title: 'updated title' },
  },
  discussion:{
    create: { title: 'test title', message: 'test message' },
    update: { title: 'updated title' },
    parent: course.discussions
  },
  quiz:{
    create:{ title:'test title' },
    update:{ title:'updated title' },
    parent: course.quizzes
  },
  question:{
    create: { question_name: 'test title' },
    update: { question_name: 'updated title' },
  }
}


Object.keys(tests).filter(name => tests[name].parent).forEach(stackIt)

function stackIt(name){
  testIt(name)
  var children = (api[name].children || [])
  children.filter(({name,type}) => tests[type]).forEach(({name,type}) => stackIt(type))
  deleteIt(name)
}


function testIt(name) {
  var item,parent
  var test = tests[name]
  describe(name, () => {
    if (test.create) {
      describe('#create()', () => {
        it('should be created without any errors', async () => {
          parent = test.parent
          item = await parent.create(test.create)
          test.instance = item
        })
      })
    } else {
      item = test.instance
    }
    describe('#get()', () => {
      it('should be found on canvas', async () => {
        var found = await item.get()
        assert(found.getId() == item.getId())
      })
    })
    describe('#update()', () => {
      it('should get it\'s properties changed', () => {
        Object.assign(item, test.update)
        for ([key, value] of Object.entries(test.update)) {
          assert(item[key] == test.update[key])
        }
      })
      it('should update without an error', async () => {
        await item.update()
      })
      it('should have the updated info on canvas', async () => {
        await item.get()
        for ([key, value] of Object.entries(test.update)) {
          assert(item[key] == test.update[key])
        }
      })
      after(async () => {
        Object.assign(item, test.create)
        await item.update()
      })
    })
    after(() => {
      var children = (api[name].children || [])
      children.filter(({name,type}) => tests[type]).forEach(({name,type}) => {
        tests[type].parent = item[name]
      })
    })
  })
}
function deleteIt(name){
  if (tests[name].delete !== false) {
    describe(name+' #delete()', () => {

      it('should get deleted without an error', async () => {
        await tests[name].parent.delete(tests[name].instance.getId())
      })
      if(name != 'quiz'){
        it('should\'nt be on canvas anymore', async () => {
          var error
          try {
            await tests[name].instance.get()
          } catch (e) {
            error = e
          }
          assert(error != undefined)
        })
      }
      it('should\'nt be in our list anymore', async () => {
        assert(!tests[name].parent.includes(tests[name].instance))
      })
    })
  }
}
