const test = require('ava')

const { todos, } = require('./mocks/data')
const { unixToDateString, addDurationProp, } = require('./mocks/mods')
const { isType, } = require('../lib/utils')

const probablyTheWorseDateRegexEver = /^([a-zA-Z]{3} )+\d{2}\s\d{4}\s(\d{2}:?)+/

let client
test.before('start server', async () => {
  require('./mocks/server')
})

/**
 * noDefaults
 */

test('noDefaults will nullify all missing props :: unary', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
  })

  const { id, } = todos[2]

  const doc = await client.unary({ id, })
  t.is(null, doc.completed)
})

test('noDefaults will nullify all missing props :: client stream :: repeated response type', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
  })

  const stream = client.clientStream()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const { data: docs, } = await stream.getPromise()
  t.truthy(docs.slice(2).every(todo => todo.completed === null))
})

test('noDefaults will nullify all missing props :: server stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
  })

  const docs = await client.serverStream({}).toPromise()

  t.falsy(todos[2].hasOwnProperty('completed'))
  t.truthy(docs[2].hasOwnProperty('completed'))
  t.truthy(docs[2].completed === null)
  t.falsy(todos[3].hasOwnProperty('completed'))
  t.truthy(docs[3].hasOwnProperty('completed'))
  t.truthy(docs[3].completed === null)
})

test('noDefaults will nullify all missing props :: bidi stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
  })

  const stream = client.bidiStream()
  const promise = stream.getObservable().toPromise()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const docs = await promise

  t.falsy(todos[2].hasOwnProperty('completed'))
  t.truthy(docs[2].hasOwnProperty('completed'))
  t.truthy(docs[2].completed === null)
  t.falsy(todos[3].hasOwnProperty('completed'))
  t.truthy(docs[3].hasOwnProperty('completed'))
  t.truthy(docs[3].completed === null)
})

/**
 * noNilProps
 */

test('noNilProps will remove any null or undefined props :: unary', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
  })

  const doc = await client.unary({ id: todos[3].id, })
  t.falsy(todos[3].hasOwnProperty('completed'))
  t.falsy(doc.hasOwnProperty('completed'))
})

test('noNilProps will remove any null or undefined props :: client stream :: repeated response type', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
  })

  const stream = client.clientStream()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const { data: docs, } = await stream.getPromise()
  t.truthy(docs.slice(2).every(todo => !todo.hasOwnProperty('completed')))
})

test('noNilProps will remove any null or undefined props :: server stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
  })

  const docs = await client.serverStream({}).toPromise()

  t.falsy(todos[2].hasOwnProperty('completed'))
  t.falsy(docs[2].hasOwnProperty('completed'))
  t.falsy(todos[3].hasOwnProperty('completed'))
  t.falsy(docs[3].hasOwnProperty('completed'))
})

test('noNilProps will remove any null or undefined props :: bidi stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
  })

  const stream = client.bidiStream()
  const promise = stream.getObservable().toPromise()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const docs = await promise

  t.falsy(todos[2].hasOwnProperty('completed'))
  t.falsy(docs[2].hasOwnProperty('completed'))
  t.falsy(todos[3].hasOwnProperty('completed'))
  t.falsy(docs[3].hasOwnProperty('completed'))
})

/**
 * enforceNumber
 */

test('enforceNumber will turn `int64` values to numbers :: unary', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    enforceNumber: true,
  })

  const doc = await client.unary({ id: todos[0].id, })
  t.truthy(isType('number', todos[0].created))
  t.truthy(isType('number', doc.created))
})

test('enforceNumber will turn `int64` values to numbers :: client stream :: repeated response type', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    enforceNumber: true,
  })

  const stream = client.clientStream()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const { data: docs, } = await stream.getPromise()
  t.truthy(docs.every(({ created, }) => isType('number', created)))
  t.truthy(docs.every(({ completed, }) => isType('number', completed)))
})

test('enforceNumber will turn `int64` values to numbers :: server stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
  })

  const docs = await client.serverStream({}).toPromise()

  t.plan(4)
  for (const { created, } of docs) {
    t.truthy(isType('number', created))
  }
})

test('enforceNumber will turn `int64` values to numbers :: bidi stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
  })

  const stream = client.bidiStream()
  const promise = stream.getObservable().toPromise()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const docs = await promise

  t.falsy(todos[2].hasOwnProperty('completed'))
  t.falsy(docs[2].hasOwnProperty('completed'))
  t.falsy(todos[3].hasOwnProperty('completed'))
  t.falsy(docs[3].hasOwnProperty('completed'))
})

/**
 * Custom mods :: manipulate props
 */

test('custom mods :: single mod function :: manipulate props :: unary', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
    mods: unixToDateString,
  })

  const doc = await client.unary(todos[0].id)

  t.is(todos[0].id, doc.id)
  t.is(todos[0].label, doc.label)
  t.truthy(isType('number', todos[0].completed))
  t.regex(doc.completed, probablyTheWorseDateRegexEver)
})

test('custom mods :: single mod function :: manipulate props :: client stream :: repeated response type', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
    mods: unixToDateString,
  })

  const stream = client.clientStream()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const { data: docs, } = await stream.getPromise()

  t.is(todos[1].id, docs[1].id)
  t.is(todos[1].label, docs[1].label)
  t.truthy(isType('number', todos[1].completed))
  t.regex(docs[1].completed, probablyTheWorseDateRegexEver)
})

test('custom mods :: single mod function :: manipulate props :: server stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
    mods: unixToDateString,
  })

  const docs = await client.serverStream({}).toPromise()

  t.is(todos[2].id, docs[2].id)
  t.is(todos[2].label, docs[2].label)
  t.truthy(isType('number', todos[2].created))
  t.regex(docs[2].created, probablyTheWorseDateRegexEver)
})

test('custom mods :: single mod function :: manipulate props :: bidi stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
    mods: unixToDateString,
  })

  const stream = client.bidiStream()
  const promise = stream.getObservable().toPromise()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const docs = await promise

  t.is(todos[3].id, docs[3].id)
  t.is(todos[3].label, docs[3].label)
  t.truthy(isType('number', todos[3].created))
  t.regex(docs[3].created, probablyTheWorseDateRegexEver)
})

test('custom mods :: list of mod functions :: add props :: unary', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
    mods: [ unixToDateString, addDurationProp, ],
  })

  const doc = await client.unary(todos[0].id)

  t.truthy(doc.hasOwnProperty('duration'))
  t.regex(doc.duration, /^\d{1,2}\s(hours and)\s\d{1,2}\s(minutes)/)
})

test('custom mods :: list of mod functions :: add props :: client stream :: repeated response type', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
    mods: [ unixToDateString, addDurationProp, ],
  })

  const stream = client.clientStream()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const { data: docs, } = await stream.getPromise()

  t.truthy(docs[0].hasOwnProperty('duration'))
  t.regex(docs[0].duration, /^\d{1,2}\s(hours and)\s\d{1,2}\s(minutes)/)
})

test('custom mods :: list of mod functions :: add props :: server stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
    mods: [ unixToDateString, addDurationProp, ],
  })

  const docs = await client.serverStream({}).toPromise()

  t.truthy(docs[1].hasOwnProperty('duration'))
  t.regex(docs[1].duration, /^\d{1,2}\s(hours and)\s\d{1,2}\s(minutes)/)
})

test('custom mods :: list of mod functions :: add props :: bidi stream', async t => {
  client = require('./mocks/client/configAndModsTestClient')({
    noDefaults: true,
    noNilProps: true,
    enforceNumber: true,
    mods: [ unixToDateString, addDurationProp, ],
  })

  const stream = client.bidiStream()
  const promise = stream.getObservable().toPromise()

  for (const { id, } of todos) {
    stream.write({ id, })
  }
  stream.end()

  const docs = await promise

  t.truthy(docs[0].hasOwnProperty('duration'))
  t.regex(docs[0].duration, /^\d{1,2}\s(hours and)\s\d{1,2}\s(minutes)/)
})
