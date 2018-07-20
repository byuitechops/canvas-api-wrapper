const canvas = require('../main')
const assert = require('better-assert')
let course = canvas.getCourse(11310)

describe('tests using pages',() => {
  let page
  
  function hooks(){

    before(async () => {
      page = await course.pages.create({
        title:'Test Title',
        body:'Test Html',
        published: true
      })
    })

    after(() => {
      // don't care when it completes or if it fails
      page.delete().catch(() => {})
      course = canvas.getCourse(11310)
    })
  }
  
  describe('Deleting child deletes it from the parent array',() => {
    hooks()

    it('should be found in the parent array',() => {
      assert(course.pages.find(p => p.getId() == page.getId()))
    })
    it('should be deleted without errors',async () => {
      await page.delete()
    })
    it('should not be found in the parent array',() => {
      assert(!course.pages.find(p => p.getId() == page.getId()))
    })
  })
  
  describe('Getting complete page gets the html',() => {
    hooks()

    it('should get the pages without an error',async () => {
      course.pages.length = 0
      await course.pages.getComplete()
    })
    it('should get the page\'s html',() => {
      assert(course.pages.find(p => p.getId() == page.getId()).getHtml())
    })
  })
  
  describe('GetOne uses the same existing pointer',() => {
    hooks()

    before(async () => {
      await course.pages.get()
    })

    it('should have the same object',() => {
      assert(page == course.pages.find(p => p.getId() == page.getId()))
    })
  })
})

describe('tests using quizzes',() => {
  let quiz
  let question

  function hooks(){
    before(async () => {
      quiz = await course.quizzes.create({
        title:'Test Title',
        body:'Test Html',
        published: true
      })
  
      question = await quiz.questions.create({
        question_name: 'test title'
      })
    })
  
    after(async () => {
      await quiz.delete()
      course = canvas.getCourse(11310)
    })

  }

  describe('legacy #getAll(true)',() => {
    hooks()

    it('should contain the questions',async () => {
      course.quizzes.length = 0
      await course.quizzes.getAll(true)
      assert(course.quizzes.find(q => q.getId() == quiz.getId()).questions.length)
    })
  })

  describe('legacy #getOne(true)',() => {
    hooks()

    it('should contain the questions',async () => {
      course.quizzes.length = 0
      
      var q = await course.quizzes.getOne(quiz.getId(),true)
      
      assert(q.questions.length)
    })
  })

  describe('changes propagate up',() => {
    hooks()
    it('course should not be marked for change',() => {
      assert(!course.hasChanged())
    })
    it('quizzes should not be marked for change',() => {
      assert(!course.quizzes.hasChanged())
    })
    it('course should be marked as changed',() => {
      question.question_name = "bob"
      assert(course.hasChanged())
    })
    it('quizzes should be marked as changed',() => {
      assert(course.quizzes.hasChanged())
    })
  })

  describe('#getFlattened()',() => {
    hooks()

    it('should contain the question',() => {
      assert(course.quizzes.getFlattened().find(n => n.getId() == question.getId()))
    })
  })
})

describe('callbacks',() => {
  let page
  describe('#create()',() => {
    it('should handle the callback',done => {
      course.pages.create({
        title:'Test Title',
        body:'Test Html',
        published: true
      },(err,p) => {
        page = p;
        done(err)
      })
    })
  })
  describe('#get()',() => {
    it('should handle the callback',done => {
      page.get(done)
    })
  })
  describe('#update()',() => {
    it('should handle the callback',done => {
      page.published = false
      page.update(done)
    })
  })
  describe('#delete()',() => {
    it('should handle the callback',done => {
      page.delete(done)
    })
  })
})

describe('weird post body thing',() => {
  let page

  describe('#create()',() => {
    it('should create without an error',async () => {
      page = await course.pages.create({
        'wiki_page[title]':'Test Title',
        'wiki_page[body]':'Test Html',
        'wiki_page[published]': false
      })
    })
  })
  describe('#get()',() => {
    it('should have the correct properties',async () => {
      await page.get()
      assert(page.published == false)
    })
  })
  describe('#update()',() => {
    it('should update without an error',async () => {
      await page.update({
        'wiki_page[published]':true
      })
    })
  })
  after(async () => {
    await page.delete()
  })
})