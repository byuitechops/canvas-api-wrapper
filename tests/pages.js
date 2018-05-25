const canvas = require('../main')
const assert = require('better-assert')
const course = canvas.getCourse(11310)

let newpage

describe('Page',() => {
  describe('#create()',async () => {
    it('should be created without any errors',async () => {
      newpage = await course.pages.create({
        title:'Test Title',
        body:'Test Html',
        published: true
      })
    })
  })
  describe('#get()',() => {
    it('should be found on canvas',async () => {
      var found = await newpage.get()
      assert(found.getId() == newpage.getId())
    })
  })
  describe('#update()',() => {
    it('should get it\'s properties changed',() => {
      newpage.setTitle('Updated Test Title')
      newpage.setHtml('Updated Test Html')
      assert(newpage.getTitle() == 'Updated Test Title')
      assert(newpage.getHtml() == 'Updated Test Html')
    })
    it('should update without an error',async () => {
      await newpage.update()
    })
    it('should have the updated info on canvas',async () => {
      await newpage.get()
      assert(newpage.getTitle() == 'Updated Test Title')
    })
  })
  describe('#delete()',() => {
    it('should get deleted without an error',async () => {
      await course.pages.delete(newpage.getId())
    })
    it('should\'nt be on canvas anymore',async ()=> {
      var error
      try{
        await newpage.get()
      } catch(e){
        error = e
      }
      assert(error != undefined)
    })
    it('should\'nt be in our list anymore',async () => {
      assert(!course.pages.includes(newpage))
    })
  })
})

describe('Pages',() => {
  before(async () => {
    newpage = await course.pages.create({
      title:'Test Title',
      body:'Test Html',
      published: true
    })
  })
  after(async () => {
    await course.pages.delete(newpage.getId())
  })
  describe('#get()',() => {
    it('should get without throwing an error',async () => {
      await course.pages.get()
    })
    it('should find the one we created', () => {
      assert(course.pages.find(item => item.getId() == newpage.getId()))
    })
    it('Pointer to newpage should still be in list',() => {
      assert(course.pages.includes(newpage))
    })
  })
  describe('#getComplete()',() => {
    it('should get without throwing an error',async () => {
      await course.pages.getComplete()
    })
    it('should find the one we created with a body', () => {
      assert(course.pages.find(item => item.getId() == newpage.getId()).getHtml())
    })
    it('Pointer to newpage should still be in list',() => {
      assert(course.pages.includes(newpage))
    })
  })
  describe('#getOne()',() => {
    var found
    it('should get without throwing an error',async () => {
      found = await course.pages.getOne(newpage.getId())
    })
    it('should find the one we created', () => {
      assert(found.getId() == newpage.getId())
    })
    it('should\'nt have multiple of the same one in the array',() => {
      assert(course.pages.filter(item => item.getId() == newpage.getId()).length == 1)
    })
    it('Pointer to newpage should still be in list',() => {
      assert(course.pages.includes(newpage))
    })
  })
  describe('#update()',() => {
    it('should get it\'s properties changed',() => {
      newpage.setTitle('Updated Test Title')
      newpage.setHtml('Updated Test Html')
      assert(newpage.getTitle() == 'Updated Test Title')
      assert(newpage.getHtml() == 'Updated Test Html')
    })
    it('should update without an error',async () => {
      await course.pages.update()
    })
    it('should have the updated info on canvas',async () => {
      await newpage.get()
      assert(newpage.getTitle() == 'Updated Test Title')
    })
  })
})