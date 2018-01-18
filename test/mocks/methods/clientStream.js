const delay = require('delay')

const { todos, } = require('../data')
const { dbReadError, } = require('./errors')

function getTodoSync (id) {
  return todos.find(t => t.id === id)
}

async function getTodoAsync (id) {
  await delay(100)
  return getTodoSync(id)
}

async function clientStream (call, callback) {
  const docs = []
  let requestCount = 0
  let fulfillCount = 0

  call.on('data', async ({ id, }) => {
    requestCount++
    const doc = await getTodoAsync(id)
    docs.push(doc)
    fulfillCount++

    if (!call.readable && fulfillCount === requestCount) {
      callback(null, { data: docs, })
    }
  })

  call.on('end', () => {
    // call.readable === false
  })
}

async function clientStreamWithError (call, callback) {
  const docs = []
  let requestCount = 0
  let fulfillCount = 0

  call.on('data', async ({ id, }) => {
    requestCount += 1

    try {
      if (fulfillCount === 2) {
        throw dbReadError
      }
      const doc = getTodoSync(id)
      docs.push(doc)
      fulfillCount += 1
      if (!call.readable && fulfillCount === requestCount) {
        callback(null, { data: [ ...docs, ], })
      }
    } catch (e) {
      call.emit('error', e)
    }
  })

  call.on('end', () => {
    // call.readable === false
  })
}

async function clientStreamWithMetadata (call, callback) {
  const md = call.metadata.getMap()

  for (const key in md) {
    callback(null, { key, value: md[key], })
    // just the first key
    break
  }
}

module.exports = {
  clientStream,
  clientStreamWithError,
  clientStreamWithMetadata,
}
