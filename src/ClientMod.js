import Observable from 'zen-observable'

import { compose, flip, curryN, isType, } from './utils'
import { noNilProps, enforceNumber, } from './mods'

Observable.prototype.toPromise =
  Observable.toPromise ||
  function toPromise () {
    let value = []
    return new Promise((resolve, reject) => {
      this.subscribe({
        next: data => value.push(data),
        error: reject,
        complete: () => resolve(value),
      })
    })
  }

export default class ClientMod {
  constructor (client, schema, config = {}) {
    this.client = client

    this.schema = (schema || { messages: [], }).messages.reduce(
      (acc, { name, fields, }) => ({
        ...acc,
        [name]: fields.reduce((acc, curr) => {
          Object.defineProperty(curr, 'getTypeSchema', {
            writable: false,
            enumerable: false,
            configurable: false,
            value: (type = curr.type) => this.schema[type],
          })
          return {
            ...acc,
            [curr.name]: curr,
          }
        }, {}),
      }),
      {}
    )

    this.noDefaults = config.noDefaults
    this.mod = this.mod.bind(this)

    const modList = []
    config.enforceNumber && modList.push(enforceNumber)
    config.noNilProps && modList.push(noNilProps)

    this.mods = (data, context) => {
      const userMods = isType('function', config.mods)
        ? [ config.mods, ]
        : config.mods || []

      const userModList = (userMods || []).map(fn =>
        curryN(flip(fn), 2)(context)
      )
      return compose.call(context, ...[ ...userModList, ...modList, ])(data)
    }
  }

  applyMods (data, context) {
    if (data == null) return data
    return isType('array', data)
      ? data.map(doc => this.mods(doc, context))
      : this.mods(data, context)
  }

  modClientStreamCall (method) {
    const responseType = method.responseType.name

    return md => {
      let stream
      const promise = new Promise((resolve, reject) => {
        const callback = (error, response) => {
          error
            ? reject(error)
            : resolve(this.applyMods(response, this.schema[responseType]))
        }

        stream = method.call(this.client, md, callback)
      })

      stream.getPromise = function () {
        return promise
      }
      return stream
    }
  }

  modServerStreamCall (method) {
    const responseType = method.responseType.name

    return (request, md) =>
      new Observable(observer => {
        const stream = method.call(this.client, request, md)

        stream.on('error', error => observer.error(error))
        stream.on('end', () => observer.complete())
        stream.on('data', data =>
          observer.next(this.applyMods(data, this.schema[responseType]))
        )
      })
  }

  modBidirectionalStreamCall (method) {
    const responseType = method.responseType.name

    return md => {
      const stream = method.call(this.client, md)

      const observable = new Observable(observer => {
        stream.on('error', error => observer.error(error))
        stream.on('end', () => observer.complete())
        stream.on('data', data =>
          observer.next(this.applyMods(data, this.schema[responseType]))
        )
      })

      stream.getObservable = () => observable
      return stream
    }
  }

  modUnaryCall (method) {
    const responseType = method.responseType.name

    return (request, mdOrCb) =>
      new Promise((resolve, reject) => {
        const callback = (error, response) => {
          error
            ? reject(error)
            : resolve(this.applyMods(response, this.schema[responseType]))
        }

        const args = [ request, ]
        !isType('function', mdOrCb) && args.push(mdOrCb)

        method.call(this.client, ...args, callback)
      })
  }

  setDefaultNull (children) {
    return children.map(child => {
      child.defaultValue = null
      if (isType('object', child.resolvedType)) {
        child.resolvedType.children = this.setDefaultNull(
          child.resolvedType.children
        )
      }

      return child
    })
  }

  mod (method) {
    const { requestStream, responseStream, } = method

    this.noDefaults &&
      (method.responseType.children = this.setDefaultNull(
        method.responseType.children
      ))

    if (this.noDefaults) {
      method.responseType.children = method.responseType.children.map(function (
        child
      ) {
        child.defaultValue = null
        return child
      })
    }

    switch (true) {
      case !requestStream && !responseStream:
        return this.modUnaryCall(method)
      case requestStream && !responseStream:
        return this.modClientStreamCall(method)
      case !requestStream && responseStream:
        return this.modServerStreamCall(method)
      case requestStream && responseStream:
        return this.modBidirectionalStreamCall(method)
    }
  }
}
