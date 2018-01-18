const path = require('path')
const grpc = require('grpc')

const { unary, serverStream, clientStream, bidiStream, } = require('../methods')

const { PORT = 8081, } = process.env

const methods = {
  ...unary,
  ...serverStream,
  ...clientStream,
  ...bidiStream,
}

const PROTO_PATH = path.resolve(__dirname, '../pb/messages.proto')
const { test: { TestService: { service, }, }, } = grpc.load(PROTO_PATH)
const server = new grpc.Server()
server.addService(service, methods)
server.bind(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure())

server.start()

// eslint-disable-next-line
console.log(`Test server started on port ${PORT}`)

module.exports = server
