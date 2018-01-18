const path = require('path')
const { credentials, } = require('grpc')

const { GRPCModClient, } = require('../../../')

const PROTO_PATH = path.resolve(__dirname, '../pb/messages.proto')
const client = new GRPCModClient({
  protoPath: PROTO_PATH,
  packageName: 'test',
  serviceName: 'TestService',
  serverAddress: `localhost:${process.env.PORT || 8081}`,
  credentials: credentials.createInsecure(),
})
module.exports = client
