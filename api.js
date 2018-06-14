const canvas = require('./canvas')
const ItemClass = require('./ItemClass')

var example = {
  /*
    [Required] path can be a number of things because it needs to be very flexable. 
    
    path <string> - the path is appended to the back of /api/v1/course/:course/

    [path <string>, includeCourse=true <boolean>] - if an array then first element is the path, 
    and second is whether to include the course (defaults to true)

    function(parents <array>, isIndividual <boolean>){} <string>||<array> - if a function it is
    passed the array of parent ids and whether the individual version is needed or not
    (meaning that the id will be appended to the back) return value is the same as 
    other path values
  */
  path: 'path', 
  // /api/v1/course/:course/path 
  // /api/v1/course/:course/path/:id
  path: ['path',false],
  // /api/v1/path 
  // /api/v1/path/:id
  path: ([course,parentId,id],isIndividual) => `something/${parentId}/otherthing`,
  // /api/v1/course/something/:parentId/otherthing
  // /api/v1/course/something/:parentId/otherthing/:id
  path: (parents,isIndividual) => ['path',!isIndividual],
  // /api/v1/course/path
  // /api/v1/path/:id
  /* 
    [Optional] Sometimes the objects are wrapped in weird properties when being 
    created or updated. Such as pages which create object looks like 
    { wiki_page: { title: 'new page' } }
    If undefined it will not wrap the create object
  */
  postbody: 'wiki_page',
  /* 
    [Optional] the property name of the title attribute. 
    If undefined it will throw an error when getTitle/setTitle is called
  */
  title: 'name',
  /* 
    [Optional] the property name of the html/description attribute. 
    If undefined it will throw an error when getHtml/setHtml is called
  */
  html: 'description',
  /* 
    [Optional] the property name of the url attribute or a function 
    which takes the ids array and returns a uri to be resolved with the correct domain
    If undefined it will throw an error when getUrl is called
  */
  url: 'html_url',
  url: ids => 'path', // => https://byui.instructure.com/path
  /* 
    [Optional] An array of children (or just a single object) in the 
    form {name,type} where name is what the property name where they live
    and type is the refference to which api it should use
    Defaults to an empty array
  */
  children: [{ name:'questions', type:'question' }],
  children: { name:'questions', type:'question' },
  /* 
    [Optional] Functions to add or replace on the Item prototype
  */
  custom:{
    makeMeASandwich(){
      console.log('here is a sandwich')
    }
  }
}

module.exports = {
  course:{
    path: [`courses`,false],
    postbody:'course',
    title:'name',
    url: ([course]) => `/courses/${course}`,
    children:[{
      name:'assignments',
      type:'assignment'
    },{
      name:'discussions',
      type:'discussion'
    },{
      name:'files',
      type:'file'
    },{
      name:'folders',
      type:'folder'
    },{
      name:'modules',
      type:'module'
    },{
      name:'pages',
      type:'page'
    },{
      name:'quizzes',
      type:'quiz',
    },{
      name:'groupCategories',
      type:'groupCategory'
    },{
      name:'groups',
      type:'group'
    }],
  },
  assignment:{
    path:'assignments',
    postbody:'assignment',
    title:'name',
    html:'description',
    url:'html_url',
    children:[{
      name:'overrides',
      type:'override'
    },{
      name:'submissions',
      type:'submission'
    }]
  },
  override:{
    path: ([,assignment]) => `assignments/${assignment}/overrides`,
    postbody:'assignment_override',
    title:'title'
  },
  submission: {
    path: ([,assignment]) => `assignments/${assignment}/submissions`,
    postbody:'submission',
    id:'user_id',
    html:'body',
    url:'preview_url',
    custom:{
      delete(){
        throw new Error("Can't delete a reply")
      }
    }
  },
  discussion:{
    path:'discussion_topics',
    title:'title',
    html:'message',
    url:'html_url',
    children:{
      name:'entries',
      type:'entry'
    }
  },
  entry:{
    path:([,discussion]) => `discussion_topics/${discussion}/entries`,
    html:'message',
    children:{
      name:'replies',
      type:'reply'
    },
    custom:{
      async getSub(){
        if(this.has_more_replies === false){
          this.replies.setData(this.recent_replies)
        }
        // ORIGINAL
        await Promise.all(this.getSubs().map(sub => sub.getComplete()))
        // reset the has changed
        this._original = JSON.stringify(this)
      }
    }
  },
  reply:{
    path:([,discussion,entry]) => `discussion_topics/${discussion}/entries/${entry}/replies`,
    html:'message',
    custom:{
      update(){
        throw new Error("Can't update a reply")
      },
      delete(){
        throw new Error("Can't delete a reply")
      }
    }
  },
  file:{
    path:(parents,individual) => ['files',!individual],
    title: 'display_name',
    url: ([course,id]) => `/courses/${course}/files/?preview=${id}`,
    custom:{
      setTitle(val){
        this.display_name = val
        this.name = val
      },
      create(){
        throw new Error("Not possible to create a File")
      },
    }
  },
  folder:{
    path: (parents,individual) => ['folders',!individual],
    title: 'name',
    url: 'folders_url',
  },
  module:{
    path:'modules',
    postbody:'module',
    title:'name',
    url: ([course,id]) => `/courses/${course}/modules#context_module_${id}`,
    children:{
      name:'moduleItems',
      type:'moduleItem'
    }
  },
  moduleItem:{
    path: ([,module]) => `modules/${module}/items`,
    postbody: 'module_item',
    title:'title',
    url:'html_url'
  },
  page:{
    path:'pages',
    postbody:'wiki_page',
    title:'title',
    html:'body',
    url:'html_url',
    id:'page_id',
    custom:{
      getSub(){
        return this.get()
      }
    }
  },
  quiz:{
    path:'quizzes',
    postbody:'quiz',
    title:'title',
    html:'description',
    url:'html_url',
    children:[{
      name:'questions',
      type:'question'
    }]
  },
  question:{
    path: ([,quiz]) => `quizzes/${quiz}/questions`,
    postbody: 'question',
    title: 'question_name',
    html: 'question_text',
    url: ([course,quiz,id]) => `/courses/${course}/quizzes/${quiz}/edit#question_${id}`
  },
  quizSubmission:{
    path: ([,quiz]) => `quizzes/${quiz}/submissions`,
    custom: {
      async complete(callback=undefined){
        if(callback){return util.callbackify(this.complete.bind(this))(...arguments)}

        var data = await canvas.post(this.getPath()+'/complete',{
          attempt:this.attempt,
          validation_token:this.validation_token,
          access_code: this.access_code
        })
        this.setData(data)
      }
    }
  },
  groupCategory:{
    path: (parents,individual) => ['group_categories',!individual],
    title: 'name',
    url: ([course,id]) => `/courses/${course}/groups#tab-${id}`,
    children:{
      name:'groups',
      type:'group'
    }
  },
  group:{
    path: ([,category],individual) => {
      if(individual){
        return ['groups',false]
      } else if(category){
        return [`group_categories/${category}/groups`,false]
      } else {
        return 'groups'
      }
    },
    title: 'name',
    html: 'description',
    url: ([course,id]) => `/groups/${id}`,
    children: {
      name:'memberships',
      type:'membership'
    },
  },
  membership:{
    path: parents => [`groups/${parents[parents.length-1]}/memberships`,false]
  }
}