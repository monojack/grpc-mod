const grpc = require('grpc')
const GRPCError = require('grpc-error')

const genericError = new GRPCError(
  'Requested resource was not found',
  grpc.status.NOT_FOUND,
  {
    status: 'NOT_FOUND',
  }
)

const dbReadError = new GRPCError(
  `Couldn't read from the database`,
  grpc.status.UNKNOWN,
  { status: 'UNKNOWN', }
)

const dbReadErrorStatus = {
  code: grpc.status.UNKNOWN,
  details: `Couldn't read from the database`,
  metadata: new grpc.Metadata({ status: 'UNKNOWN', }),
}

module.exports = {
  genericError,
  dbReadError,
  dbReadErrorStatus,
}
