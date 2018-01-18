const delay = require('delay')

const data = require('../data')

const { genericError, } = require('./errors')

async function getTodosAsync () {
  await delay(100)
  return data.todos
}

async function unary ({ request: { id, }, }, callback) {
  const todos = await getTodosAsync()
  const todo = todos.find(t => t.id === id)
  callback(null, todo)
}

async function unaryWithError (call, callback) {
  callback(genericError)
}

async function unaryWithMetadata (call, callback) {
  const md = call.metadata.getMap()

  for (const key in md) {
    callback(null, { key: key, value: md[key], })
    // just the first key
    break
  }
}

module.exports = {
  unary,
  unaryWithError,
  unaryWithMetadata,
}
