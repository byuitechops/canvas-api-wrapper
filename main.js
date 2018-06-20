const canvas = require('./canvas')
const helpers = require('./helpers')

/* Add all the helper functions */
Object.assign(canvas,helpers)

/* Compatability with the old canvas-wrapper */
Object.assign(canvas,{
  postJSON:canvas.post,
  getModules:(cid,callback) => canvas.getCourse(cid).modules.get(callback),
  getModuleItems:(cid,mid,callback) => canvas(`/api/v1/courses/${cid}/modules/${mid}/items`,callback),
  getPages:(cid,callback) => canvas.getCourse(cid).pages.get(callback),
  getFullPages:(cid,callback) => canvas.getCourse(cid).pages.getComplete(callback),
  getAssignments:(cid,callback) => canvas.getCourse(cid).assignments.get(callback),
  getDiscussions:(cid,callback) => canvas.getCourse(cid).discussions.get(callback),
  getFiles:(cid,callback) => canvas.getCourse(cid).files.get(callback),
  getQuizzes:(cid,callback) => canvas.getCourse(cid).quizzes.get(callback),
  getQuizQuestions:(cid,qid,callback) => canvas(`/api/v1/courses/${cid}/quizzes/${qid}/questions`,callback),
  changeUser: val => canvas.apiToken = val,
  changeDomain: val => canvas.subdomain = val,
  changeConcurrency: val => canvas.callLimit = val,
  apiCount: () => null
})

module.exports = canvas
