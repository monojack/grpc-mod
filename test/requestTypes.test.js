const test = require('ava')
const sinon = require('sinon')
const grpc = require('grpc')
const delay = require('delay')
const Observable = require('zen-observable')
const { todos, } = require('./mocks/data')

const { isType, } = require('../lib/utils')
const { genericError, dbReadError, } = require('./mocks/methods/errors')

let client
test.before('start server', async () => {
  require('./mocks/server')
  client = require('./mocks/client/requestTypesTestClient')
})

/**
 * Unary requests
 */
test('unary request', async t => {
  const { id, } = todos[0]
  const promise = client.unary({ id, })
  t.truthy(isType('Promise', promise))

  const doc = await promise
  t.is(todos[0].id, doc.id)
  t.is(todos[0].label, doc.label)
})

test('unary request :: error', async t => {
  const { id, } = todos[1]
  const dataSpy = sinon.spy()

  try {
    await client.unaryWithError({ id, })
    dataSpy()
  } catch (e) {
    t.truthy(isType('Error', e))
    t.is(genericError.code, e.code)
    t.is(genericError.message, e.message)
  } finally {
    t.falsy(dataSpy.called)
  }
})

test('unary request :: metadata', async t => {
  const md = new grpc.Metadata()
  md.add('foo', 'bar')
  const doc = await client.unaryWithMetadata({}, md)

  t.deepEqual(doc, { key: 'foo', value: 'bar', })
})

/**
 * Server stream requests
 */

test('server stream request', async t => {
  const observable = client.serverStream({})
  t.truthy(observable instanceof Observable)

  const dataSpy = sinon.spy()
  const errorSpy = sinon.spy()
  const completeSpy = sinon.spy()

  observable.subscribe({
    next: dataSpy,
    error: errorSpy,
    complete: completeSpy,
  })

  // make use of the promise (though not the scope of this test)
  // so we dont exit the test
  // before running the assertions
  await observable.toPromise()

  t.is(4, dataSpy.callCount)
  t.truthy(completeSpy.called)
  t.falsy(errorSpy.called)
})

test('server stream request :: observable.toPromise()', async t => {
  const observable = client.serverStream({})
  t.truthy(observable instanceof Observable)

  const promise = observable.toPromise()
  t.truthy(isType('Promise', promise))

  const docs = await promise
  t.is(todos.length, docs.length)
})

test('server stream request :: error', async t => {
  t.plan(2)

  const observable = client.serverStreamWithError({})
  observable.subscribe({
    error: e => t.truthy(isType('Error', e)),
  })

  try {
    await client.serverStreamWithError({}).toPromise()
  } catch (e) {
    t.truthy(isType('Error', e))
  }
})

test('server stream request :: metadata', async t => {
  const md = new grpc.Metadata()
  md.add('foo', 'bar')
  md.add('baz', 'quux')
  const docs = await client.serverStreamWithMetadata({}, md).toPromise()

  t.is(2, docs.length)
  t.deepEqual(docs, [
    { key: 'foo', value: 'bar', },
    { key: 'baz', value: 'quux', },
  ])
})

/**
 * Client stream requests
 */

test('client stream request', async t => {
  const stream = client.clientStream()

  // some async writes
  await delay(100)
  stream.write({ id: todos[0].id, })
  await delay(100)
  stream.write({ id: todos[1].id, })

  // some sync writes
  stream.write({ id: todos[2].id, })
  stream.write({ id: todos[3].id, })
  stream.end()

  const promise = stream.getPromise()
  t.truthy(isType('Promise', promise))

  const { data: docs, } = await promise
  t.is(todos.length, docs.length)
})

test('client stream request :: cancel', async t => {
  const stream = client.clientStream()

  // some sync writes
  stream.write({ id: todos[2].id, })
  stream.write({ id: todos[3].id, })

  // some async writes
  await delay(100)
  stream.write({ id: todos[0].id, })
  await delay(100)
  stream.cancel()

  try {
    await stream.getPromise()
  } catch (e) {
    t.truthy(isType('Error', e))
    t.is('Cancelled', e.message)
  }
})

test('client stream request :: server error', async t => {
  const stream = client.clientStreamWithError()

  // some async writes
  await delay(100)
  stream.write({ id: todos[0].id, })
  await delay(100)
  stream.write({ id: todos[1].id, })

  // some sync writes
  stream.write({ id: todos[2].id, })
  stream.write({ id: todos[3].id, })
  stream.end()

  try {
    await stream.getPromise()
  } catch (e) {
    t.truthy(isType('Error', e))
    t.is(dbReadError.code, e.code)
    t.is(dbReadError.message, e.message)
  }
})

test('client stream request :: metadata', async t => {
  const md = new grpc.Metadata()
  md.add('foo', 'bar')
  const doc = await client.clientStreamWithMetadata(md).getPromise()

  t.deepEqual(doc, { key: 'foo', value: 'bar', })
})

/**
 * Bidirectional stream requests
 */

test('bidirectional stream request :: observable', async t => {
  const stream = client.bidiStream()
  const observable = stream.getObservable()

  const completeSpy = sinon.spy()
  const errorSpy = sinon.spy()

  let i = 0
  observable.subscribe({
    next: doc => {
      t.deepEqual(doc.id, todos[i].id)
      t.deepEqual(doc.label, todos[i].label)
      i++
    },
    error: errorSpy,
    complete: completeSpy,
  })

  await delay(100)
  stream.write(todos[0].id)
  await delay(100)
  stream.write(todos[1].id)

  stream.write(todos[2].id)
  stream.write(todos[3].id)
  stream.end()

  // make use of the promise (though not the scope of this test)
  // so we dont exit the test
  // before running the assertions
  await observable.toPromise()

  t.truthy(observable instanceof Observable)
  t.truthy(completeSpy.calledOnce)
  t.truthy(errorSpy.notCalled)
})

test('bidirectional stream request :: observable.toPromise()', async t => {
  t.plan(2)
  const stream = client.bidiStream()
  const errorSpy = sinon.spy()

  await delay(100)
  stream.write(todos[0].id)
  await delay(100)
  stream.write(todos[1].id)

  stream.write(todos[2].id)
  stream.write(todos[3].id)
  stream.end()

  try {
    const docs = await stream.getObservable().toPromise()
    t.is(4, docs.length)
  } catch (e) {
    errorSpy(e)
  } finally {
    t.truthy(errorSpy.notCalled)
  }
})

test('bidirectional stream request :: client cancel', async t => {
  const stream = client.bidiStream()

  stream.write({ id: todos[2].id, })
  stream.write({ id: todos[3].id, })

  await delay(100)
  stream.cancel()

  try {
    await stream.getObservable().toPromise()
  } catch (e) {
    t.truthy(isType('Error', e))
    t.is('Cancelled', e.message)
  }
})

test('bidirectional stream request :: server error', async t => {
  const stream = client.bidiStreamWithError()

  await delay(100)
  stream.write(todos[0].id)
  await delay(100)
  stream.write(todos[1].id)

  stream.write(todos[2].id)
  stream.write(todos[3].id)
  stream.end()

  try {
    await stream.getObservable().toPromise()
  } catch (e) {
    t.truthy(isType('Error', e))
    t.is(dbReadError.message, e.message)
    t.is(dbReadError.code, e.code)
  }
})

test('bidirectional stream request :: metadata', async t => {
  const md = new grpc.Metadata()
  md.add('foo', 'bar')
  md.add('baz', 'quux')
  const docs = await client
    .bidiStreamWithMetadata(md)
    .getObservable()
    .toPromise()

  t.is(2, docs.length)
  t.deepEqual(docs, [
    { key: 'foo', value: 'bar', },
    { key: 'baz', value: 'quux', },
  ])
})
