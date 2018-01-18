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

async function bidiStream (call, callback) {
  let requestCount = 0
  let fulfillCount = 0

  call.on('data', async ({ id, }) => {
    requestCount++
    const doc = await getTodoAsync(id)
    call.write(doc)
    fulfillCount++

    if (!call.readable && fulfillCount === requestCount) {
      call.end()
    }
  })

  call.on('end', () => {
    // call.readable === false
  })
}

async function bidiStreamWithError (call, callback) {
  let requestCount = 0
  let fulfillCount = 0

  call.on('data', async ({ id, }) => {
    requestCount++

    try {
      if (fulfillCount === 2) {
        throw dbReadError
      }
      const doc = getTodoSync(id)
      call.write(doc)
      fulfillCount++
    } catch (e) {
      call.emit('error', e)
    } finally {
      if (!call.readable && fulfillCount === requestCount) {
        call.end()
      }
    }
  })

  call.on('end', () => {
    // call.readable === false
  })
}

async function bidiStreamWithMetadata (call, callback) {
  const md = call.metadata.getMap()

  for (const key in md) {
    key !== 'user-agent' && call.write({ key, value: md[key], })
  }
  call.end()
}

module.exports = {
  bidiStream,
  bidiStreamWithError,
  bidiStreamWithMetadata,
}
