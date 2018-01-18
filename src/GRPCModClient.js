import fs from 'fs'
import protoSchema from 'protocol-buffers-schema'
import { load, } from 'grpc'

import mod from './mod'

export default function GRPCModClient (
  { protoPath, serverAddress, packageName, serviceName, credentials, options, },
  opts
) {
  // Create the client
  const schema = protoSchema.parse(fs.readFileSync(protoPath))
  const proto = load(protoPath)[packageName]
  const Service = proto[serviceName]
  const client = new Service(serverAddress, credentials, options)
  mod(client, schema, opts)

  return client
}
