var example = {
  /*
    [Required] path can be a simple string or if needed a 
    function which takes the array of ids and returns a string
    either way it will be coerced to
      /api/v1/course/:course/path
      /api/v1/course/:course/path/:id
  */
  path: 'path',
  path: ids => 'path',
  /* 
    You may need extra flexablility such a folders where the list of 
    folders is retrieved through /api/v1/course/:course/folders but
    to get a single folder it is through /api/v1/folders/:id so there
    are two options which are both defaulted to true
    [path, includeCourseWhenIndividual, includeCourseWhenAll]
    so for folders setting path to ['folders',false] will give you
      /api/v1/course/:course/folders
      /api/v1/folders/:id
  */
  path: ['path',true,true],
  path: [ids => 'path',true,true],
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
    path: [`courses`,false,false],
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
      name:'groups',
      type:'group'
    }],
  },
  assignment:{
    path:'assignments',
    postbody:'assignment',
    title:'name',
    html:'description',
    url:'html_url'
  },
  discussion:{
    path:'discussion_topics',
    title:'title',
    html:'message',
    url:'html_url' 
  },
  file:{
    path:'files',
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
    path: ['folders',false],
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
    path: ([course,module,id]) => `modules/${module}/items`,
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
    children:{
      name:'questions',
      type:'question'
    }
  },
  question:{
    path: ([course,quiz,id]) => `quizzes/${quiz}/questions`,
    postbody: 'question',
    title: 'question_name',
    html: 'question_text',
    url: ([course,quiz,id]) => `/courses/${course}/quizzes/${quiz}/edit#question_${id}`
  },
  group:{
    path: ['groups',false],
    title: 'name',
    html: 'description',
    url: ([course,id]) => `/courses/${course}/groups#tab-${id}`,
    children: {
      name:'memberships',
      type:'membership'
    },
  },
  membership:{
    path: [([course,group,id]) => `groups/${group}/memberships`,false,false]
  }
}