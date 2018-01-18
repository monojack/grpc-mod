const test = require('ava')

const { mod, } = require('../')
const { NO_CLIENT_ERROR_MESSAGE, NO_ENFORCENUMBER_WITHOUT_SCHEMA_MESSAGE, } = require('../lib/mod')

test('mod :: will throw if no client provided', async t => {
  t.notThrows(() => mod({}))

  const error = t.throws(mod)
  t.is(NO_CLIENT_ERROR_MESSAGE, error.message)
})

test('mod :: will throw if `enforceNumber` is activated without providing a schema', async t => {
  t.notThrows(() => mod({}, null))
  t.notThrows(() => mod({}, { messages: [], }, { enforceNumber: true, }))

  const error = t.throws(() => mod({}, null, { enforceNumber: true, }))
  t.is(NO_ENFORCENUMBER_WITHOUT_SCHEMA_MESSAGE, error.message)
})
