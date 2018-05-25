const canvas = require('./canvas')
const Items = require('./ItemsClass')
const Item = require('./ItemClass')

/***********************
* Course
************************/
class Course extends Item{
  constructor(course){
    super(course,course)

    this._post = 'course'
    this._title = 'name'
    this._url = `https://${canvas.subdomain}.instructure.com/courses/${this._course}`
    this._subs = ['files','folders','assignments','discussions','modules','pages','quizzes']

    Object.defineProperties(this,{
      files: {
        value:new Files(course),
        enumerable:true
      },
      folders: {
        value:new Folders(course),
        enumerable: true
      },
      assignments: {
        value:new Assignments(course),
        enumerable:true
      },
      discussions: {
        value:new Discussions(course),
        enumerable:true
      },
      modules: {
        value:new Modules(course),
        enumerable:true
      },
      pages: {
        value:new Pages(course),
        enumerable:true
      },
      quizzes: {
        value:new Quizzes(course),
        enumerable:true
      }
    })
  }
  getPath(){
    return `/api/v1/courses/${this._course}`
  }
}

/***********************
* Assignments
************************/
class Assignments extends Items {
  constructor(id){
    super(id)
    this.childClass = Assignment
  }
}
class Assignment extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'assignments'
    this._post = 'assignment'
    this._title = 'name'
    this._html = 'description'
    this._url = 'html_url'
  }
}
/***********************
* Discussions
************************/
class Discussions extends Items {
  constructor(id){
    super(id)
    this.childClass = Discussion
  }
}
class Discussion extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'discussion_topics'
    this._title = 'title'
    this._html = 'message'
    this._url = 'html_url'
  }
}
/***********************
* Files
************************/
class Files extends Items {
  constructor(id){
    super(id)
    this.childClass = File
    delete this.create
  }
}
class File extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'files'
    this._title = 'display_name'
    this._url = `https://${canvas.subdomain}.instructure.com/courses/${this._course}/files/?preview=${this._id}`
    delete this.create
  }
  setTitle(value){
    super.setTitle(value)
    this.name = value
  }
}
/***********************
* Folders
************************/
class Folders extends Items {
  constructor(id){
    super(id)
    this.childClass = Folder
  }
}
class Folder extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'folders'
    this._title = 'name'
    this._url = 'folders_url'
  }
  getPath(includeId=true){
    if(!includeId){
      return super.getPath(false)
    }
    return `/api/v1/folders/${this._id}`
  }
}
/***********************
* Modules
************************/
class Modules extends Items {
  constructor(id){
    super(id)
    this.childClass = Module
  }
}
class Module extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'modules'
    this._post = 'module'
    this._title = 'name'
    this._url = `https://${canvas.subdomain}.instructure.com/courses/${this._course}/modules#context_module_${this._id}`
    this._subs = ['moduleItems']
    Object.defineProperty(this,'moduleItems',{
      value:new ModuleItems(course,id),
      enumerable:true,
    })
  }
}
class ModuleItems extends Items {
  constructor(courseId,moduleId){
    super(courseId)
    this.parentId = moduleId
    this.childClass = ModuleItem
  }
  _constructItem(id){
    var item = new ModuleItem(this.course,this.parentId,id)
    super._attachListeners(item)
    return item
  }
}
class ModuleItem extends Item {
  constructor(course,module,id){
    super(course,id)
    Object.defineProperty(this,'_module',{value:module})
    this._path = `modules/${this._module}/items`
    this._post = 'module_item'
    this._title = 'title'
    this._url = 'html_url'
  }
}
/***********************
* Pages
************************/
class Pages extends Items {
  constructor(id){
    super(id)
    this.childClass = Page
  }
}
class Page extends Item {
  static get idProp(){ return 'page_id'}
  constructor(course,id){
    super(course,id)
    this._path = 'pages'
    this._post = 'wiki_page'
    this._title = 'title'
    this._html = 'body'
    this._url = 'html_url'
  }
  async getSub(){
    return this.get()
  }
}
/***********************
* Quizzes
************************/
class Quizzes extends Items {
  constructor(id){
    super(id)
    this.childClass = Quiz
  }
}
class Quiz extends Item {
  constructor(course,id){
    super(course,id)
    this._path = 'quizzes'
    this._post = 'quiz'
    this._title = 'title'
    this._html = 'description'
    this._url = 'html_url'
    this._subs = ['questions']
    Object.defineProperty(this,'questions',{
      value: new QuizQuestions(course,this.getId()),
      enumerable:true
    })
  }
}
class QuizQuestions extends Items {
  constructor(courseId,quizId){
    super(courseId)
    this.childClass = Quiz
    this.parentId = quizId
  }
  _constructItem(id){
    var item = new QuizQuestion(this.course,this.parentId,id)
    super._attachListeners(item)
    return item
  }
}
class QuizQuestion extends Item {
  constructor(course,quiz,id){
    super(course,id)
    Object.defineProperty(this,'_quiz',{value:quiz,writable:false})
    this._path = `quizzes/${this._quiz}/questions`
    this._post = 'question'
    this._title = 'question_name'
    this._html = 'question_text'
    this._url = `https://${canvas.subdomain}.instructure.com/courses/${this._course}/quizzes/${this._quiz}/edit#question_${this._id}`
  }
}

// All of this file's exports will be added to the main canvas object
module.exports.getCourse = function getCourse(id){
  if(id == undefined){
    throw new TypeError("Expected the id of the course")
  }
  var course = new Course(id)
  return course
}