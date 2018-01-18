const grpc = require('grpc')
const delay = require('delay')

const data = require('../data')

async function getTodosAsync () {
  await delay(100)
  return data.todos
}

async function serverStream (call) {
  const todos = await getTodosAsync()
  for (const todo of todos) {
    call.write(todo)
  }
  call.end()
}

async function serverStreamWithError (call) {
  const md = new grpc.Metadata()
  md.add('status', 'UNKNOWN')

  call.status = {
    code: grpc.status.UNKNOWN,
    details: 'Oops! Something went wrong!',
    metadata: md,
  }
  call.end()
}

async function serverStreamWithMetadata (call) {
  const md = call.metadata.getMap()

  for (const key in md) {
    key !== 'user-agent' && call.write({ key: key, value: md[key], })
  }
  call.end()
}

module.exports = {
  serverStream,
  serverStreamWithError,
  serverStreamWithMetadata,
}
