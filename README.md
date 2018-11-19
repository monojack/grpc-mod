# **gRPC-Mod**

[gRPC](https://grpc.io/) client that lets you manipulate the response objects and returns promises or observables for streams.


[![Build Status](https://travis-ci.org/monojack/grpc-mod.svg?branch=master)](https://travis-ci.org/monojack/grpc-mod)
[![npm version](https://img.shields.io/npm/v/grpc-mod.svg)](https://www.npmjs.com/package/grpc-mod)
[![npm downloads](https://img.shields.io/npm/dm/grpc-mod.svg)](https://www.npmjs.com/package/grpc-mod)

## Table of contents

* [Installation](#installation)
* [API by example](#api-by-example)
  * [Enhancing the client](#enhancing-the-client)
    * [GRPCModClient](#grpcmodclient)
    * [mod](#mod)
  * [Promises and observables](#promises-and-observables)
    * [Unary requests](#unary-requests)
    * [Server stream requests](#server-stream-requests)
    * [Client stream requests](#client-stream-requests)
    * [Bidirectional stream requests](#bidirectional-stream-requests)
  * [Manipulating the response](#manipulating-the-response)
    * [Provided mods](#provided-mods)
      * [noDefaults](#nodefaults)
      * [noNilProps](#nonilprops)
      * [enforceNumber](#enforcenumber)
    * [Creating custom mods](#creating-custom-mods)
      * [getTypeSchema](#gettypeschema)
      * [deepApplyMod](#deepapplymod)


## Installation
```sh
npm install grpc-mod
```

## API by example

Consider the following `.proto` file

```protobuf
syntax = "proto3";

package test;

message GetRequest {}

message GetOneRequest {
  string id = 1;
}

message GetPageRequest {
  int32 from = 1;
  int32 count = 2;
}

message SaveTodoRequest {
  string label = 1;
}

message TodoResponse {
  string id = 1;
  string label = 2;
  int64 created = 3;
  int64 completed = 4;
}

message TodoListResponse {
  repeated TodoResponse todos = 1;
}


service TestService {
  rpc getTodo (GetOneRequest) returns (TodoResponse) {}
  rpc getAllTodos (GetRequest) returns (stream TodoResponse) {}
  rpc saveTodos (stream SaveTodoRequest) returns (TodoListResponse) {}
  rpc getTodoPages (stream GetPageRequest) returns (stream TodoListResponse) {}
}
```

### Enhancing the client

There are two ways to enhance the client
  1. You either create a new client with **GRPCModClient**
```js
const client = new GRPCModClient(config)
```
  2. enhance an existing one with the **mod** method
```js
mod(client)
```

##### *GRPCModClient*
> new GRPCModClient(config: { protoPath, packageName, serviceName, serverAddress, credentials [, options] } [, options])

**config**: required - the configuration object containing information for instantiating the client. it takes the following props:
  - `protoPath`: required - path to the `.proto` file
  - `packageName`: required - name of the package
  - `serviceName`: required - name of the service we want to instantiate the client from
  - `serverAddress`: required - address of the server we want our client to connect to
  - `credentials`: required - credentials needed for connecting to the server
  - `options`: optional - options to apply to channel creation

**options**: optional - the GRPCMod client options
  - `noDefaults`: boolean: Nullifies the default values added to the response object (default is `false`) - [example](#nodefaults)
  - `noNilProps`: boolean: Removes `null` or `undefined` values from the response object (default is `false`) - [example](#nonilprops)
  - `enforceNumber`: boolean:  Turns all `int64` types into numbers (default is `false`) - [example](#enforcenumber)
  - `mods`: function | [function] : one or a list of custom [mods](#creating-custom-mods)

```js
const path = require('path')
const { credentials, } = require('grpc')
const { GRPCModClient, } = require('grpc-mod')

const PROTO_PATH = path.resolve(__dirname, '../pb/messages.proto')
const client = new GRPCModClient({
  protoPath: PROTO_PATH,
  packageName: 'test',
  serviceName: 'TestService',
  serverAddress: 'localhost:8080',
  credentials: credentials.createInsecure(),
})
```

##### *mod*
> mod(client [, schema] [, options])

```js
const path = require('path')
const { load, credentials, } = require('grpc')
const { mod, } = require('grpc-mod')

const PROTO_PATH = path.resolve(__dirname, '../pb/messages.proto')
const proto = load(PROTO_PATH).test

const client = new proto.TestService('localhost:8080', credentials.createInsecure())
mod(client)
```

The ***mod*** method is most useful when you only want to make use of promises and observables. If you want to write mods that need to know about the type of any of the properties, you would need a schema. ***GRPCModClient*** takes care of generating a schema for you, but if you really want to just use ***mod***, for whatever reason, and still write mods that depend on a schema, you'd have to provide one yourself. You can either use [protocol-buffers-schema](https://github.com/mafintosh/protocol-buffers-schema) or just write it yourself but it has to resemble the model that ***protocol-buffers-schema*** returns

>***NOTE:*** Some of the provided mods also depend on a schema and if you're using the ***mod*** method to enhance your client and activate one of those mods without providing a schema, the method will throw an error.

### Promises and observables
#### Unary requests
```js
// Simple promise
let doc
client
  .getTodo({ id: '5a54caf61bec98000f59dcbe' })
  .then(response => {
    doc = response
  })
  .catch(err => {
    console.log(err)
  })

// Async/await

let doc
try {
  doc = await client.getTodo({ id: '5a54caf61bec98000f59dcbe' })
} catch (err) {
  console.log(err)
}
```

#### Server stream requests
```js

// Using observables
const observable = client.getAllTodos({})

observable.subscribe({
  next: (data) => console.log(data),
  error: (err) => console.log(err),
  complete: () => console.log('complete')
})

// Converting to Promise
const docs = await client.getAllTodos({}).toPromise()
// docs will be an array containing all the responses

```

#### Client stream requests

```js
const todosToAdd = [...]

const stream = client.saveTodos()
// the stream has a getPromise method which you can use to listen for the response
const promise = stream.getPromise()

for(const label in todosToAdd) {
  sream.write({ label })
}
stream.end()

const docs = await promise // list of the added todos maybe?
```

#### Bidirectional stream requests
```js
const stream = client.getTodoPages()

// the stream has a getObservable method
const observable = stream.getObservable()
observable.subscribe({
  next: data => renderTable(data.todos),
  err: err => console.log(err)
})

function onPaginationSelect(from, count) {
  stream.write({from, count })
}
```

### Manipulating the response

You can manipulate the response by providing a configuration object as the second argument when creating or enhancing a client. You have access to a few mods provided by the library but you can always add your own. Keep in mind that when activating any of the provided mods, they will be executed before those you provide.

#### Provided mods
##### *noDefaults*

gRPC will add a default value for any of the props that are not present on the response object. In a client environment you might not expect a `completed` prop on a todo object that is not completed, but gRPC will actually set it to `0`. Find out more about default values [here](https://developers.google.com/protocol-buffers/docs/proto3#default).

The `noDefaults` flag will turn all the default values to null. You can further remove these props completely with `noNilProps`

```js
...
const client = new GRPCModClient({
  protoPath: PROTO_PATH,
  packageName: 'test',
  serviceName: 'TestService',
  serverAddress: 'localhost:8080',
  credentials: credentials.createInsecure(),
}, {
  noDefaults: true
})

const doc = await client.getTodo({id: '5a54caf61bec98000f59dcbe'})

// noDefaults: false =>
// {
//  id: '5a54caf61bec98000f59dcbe',
//  label: 'Do something',
//  created: '1515862405277',
//  completed: 0
// }


// noDefaults: true =>
// {
//  id: '5a54caf61bec98000f59dcbe',
//  label: 'Do something',
//  created: '1515862405277',
//  completed: null
// }
```

##### *noNilProps*

Following the `noDefaults` example, we can add `noNilProps: true` to our configuration to remove the null/undefined props completely.

```js
...
const client = new GRPCModClient({
  ...
}, {
  noDefaults: true,
  noNilProps: true
})

const doc = await client.getTodo({id: '5a54caf61bec98000f59dcbe'})

// noDefaults: true, noNilProps: true =>
// {
//  id: '5a54caf61bec98000f59dcbe',
//  label: 'Do something',
//  created: '1515862405277'
// }
```
>***NOTE:*** You need to first turn the defaults to null with `noDefaults` so they will get excluded by `noNilProps`*

##### *enforceNumber*

You might have noticed in the previous examples that `created` is a *string*. We asked for *int64* and it should be a *Long* object but what we ultimately want is a number. Read about this design [here](https://github.com/grpc/grpc/issues/7229)

The `enforceNumber` flag will turn all *int64* values to numbers. There might be more "issues" like this, but this is the one I bumped into and I seriously have no idea about any other data-types not suported by JS.

```js
...
const client = new GRPCModClient({
  ...
}, {
  noDefaults: true,
  noNilProps: true,
  enforceNumber: true
})

const doc = await client.getTodo({id: '5a54caf61bec98000f59dcbe'})

// noDefaults: true, noNilProps: true =>
// {
//  id: '5a54caf61bec98000f59dcbe',
//  label: 'Do something',
//  created: 1515862405277
// }
```

#### Creating custom mods
The configuration object accepts a 'mods' prop where you can specify one or a list of mods that you build.

```js
...
const client = new GRPCModClient({
  ...
}, {
  noDefaults: true,
  noNilProps: true,
  enforceNumber: true,
  mods: myMod // or a list: [myMod2, myMod1]
})
```
Custom mods get applied from right to left. So, if `myMod2` expects a response type returned by `myMod1`, you'd have to list them in the right order `[myMod2, myMod1]`. Also, any of the provided mods will run before yours.

**Mods** are simple functions that take 2 arguments: the `response` object and a `schema` object. The `response` object is exactly what it says, the response you get from the server. The `schema` object is not the entire schema generated from the `.proto` file, but only the part relevant to the response and only the top level. E.g.:

```js
function myMod(response, schema) {
  console.log(reponse)
  // {
  //  id: '5a54caf61bec98000f59dcbe',
  //  label: 'Do something',
  //  created: 1515862405277
  // }

  console.log(schema)
  // { id:
  //    { name: 'id',
  //      type: 'string',
  //      tag: 1,
  //      map: null,
  //      oneof: null,
  //      required: false,
  //      repeated: false,
  //      options: {}, },
  // label:
  //    { name: 'label',
  //      type: 'string',
  //      tag: 2,
  //      map: null,
  //      oneof: null,
  //      required: false,
  //      repeated: false,
  //      options: {}, },
  // created:
  //    { name: 'created',
  //      type: 'int64',
  //      tag: 3,
  //      map: null,
  //      oneof: null,
  //      required: false,
  //      repeated: false,
  //      options: {}, },
  // completed:
  //    { name: 'completed',
  //      type: 'int64',
  //      tag: 4,
  //      map: null,
  //      oneof: null,
  //      required: false,
  //      repeated: false,
  //      options: {},
  //    },
  // }
}
```

The schema is generated from the `.proto` file with [protocol-buffers-schema](https://github.com/mafintosh/protocol-buffers-schema) and is only relevant to the top level of the response object, meaning that if you have property of a custom type, the schema of that type will not be available. This prevents the need of generating deeply nested schemas and eventual circular dependencies, like in the case of a `User` type that has a field called `friends` being a repeated `User` type. Those friends would also be of type `User` and also have friends of their own and so on.

Our `saveTodos` method is a client-stream request ant it resolves with a `TodoListResponse`. The `TodoListResponse` is an object with a `todos` property of type `repeated TodoResponse` (an array of todos).

```js
function myMod(response, schema) {
  console.log(schema)
  // { todos:
  //    { name: 'todos',
  //      type: 'TodoResponse',
  //      tag: 1,
  //      map: null,
  //      oneof: null,
  //      required: false,
  //      repeated: true,
  //      options: {},
  //    },
  // }
}
```

##### *getTypeSchema*

If we want to modify all the todos in that list, we'd have to `map` over `data`. This is pretty trivial if we don't need to check the type of the todo's properties, but if we want to manipulate a value based on the type of that property, we'd need access to the `TodoResponse` schema.

There is, however, a method to retrieve the schema of a property's type, `getTypeSchema`. This method is part of the schema object of every type and we'll see how it works by exploring how you'd implement a mod similar to [enforceNumber](#enforcenumber).

```js
function enforceNumber(response, schema){
  // response is { todos: [{...}, {...}, {...}] }

  const todoSchema = schema['todos'].getTypeSchema()

  const moddedList = response.todos.map(todo => {
    // reduce the todo entries and create a new object
    return Object.entries(todo).reduce((acc, [key, value]) => {
      // if the current property is of type `int64` we parse it into a number
      return {
        ...acc,
        [key]: todoSchema[key].type === 'int64' ? parseInt(value) : value
      }
    }, {})
  })

  // Return the modified response object,
  // or you can just return the list, but I recommend you stick with the contract
  return { todos: moddedList }
}
```
>***NOTE:*** This is not how `enforceNumber` is written. The actual implementation recursively handles nested response objects and are partially applied with the `schema` argument. You can read through the source if you're interested how it all works.

##### *deepApplyMod*
> deepApplyMod(response [, schema], transformFn [, predicate])

This is a helper function, provided by 'grpc-mod' which you can use to apply mods to nested response objects.

Let's say that we want to transform `created` and `completed` props from unix to date strings.

```js
function unixToDateString(response) {
  return {
    ...response,
    created: new Date(response.created).toString(),
    completed: new Date(response.completed).toString()
  }
}
```
And then we add this function to the mods. Easy, right? This is enough if we only ever get a `TodoResponse`, but in the case of a `TodoListResponse`, it won't get applied. Remember, `TodoListResponse` looks like:

```js
{ data: [TodoResponse, TodoResponse, TodoResponse, ...]}
```
so there will be no 'created' or 'completed' props. In fact, with the above mod, those would get added alongside `data`.
We'll use `deepApplyMod` to solve this issue, providing a transformation function and a predicate to only apply it to the `created` and `completed` keys.

The *transformation function* takes a single argument, and it's the value of the currently iterated property. The *predicate* is optional (default `true`), and it's a function that takes 2 arguments, the `key` and the `value` of the property.

```js
import { deepApplyMod } from 'grpc-mod'

// This is the transformation function that will get applied to the properties
const convertToDateString =(value) => new Date(value).toString()

// We want to also provide a predicate to apply that transformation only to the `created` and `completed` keys
const isDateProp = (key, value) => ['created', 'completed'].includes(key)

function unixToDateString(response, schema) {
  return deepApplyMod(response, null, convertToDateString, isDateProp)
}
```
