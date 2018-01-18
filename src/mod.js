import ClientMod from './ClientMod'

import { isNil, } from './utils'

export const NO_CLIENT_ERROR_MESSAGE = `No client provided`
export const NO_ENFORCENUMBER_WITHOUT_SCHEMA_MESSAGE = `You can't activate 'enforceNumber' without providing a schema`

function validateClient (client) {
  if (isNil(client)) { throw new Error(NO_CLIENT_ERROR_MESSAGE) }
}

function validateOptions (options = {}, schema) {
  if (!isNil(schema)) return

  if (options.enforceNumber) {
    throw new Error(NO_ENFORCENUMBER_WITHOUT_SCHEMA_MESSAGE)
  }
}

export default function mod (client, schema, options) {
  validateClient(client)
  validateOptions(options, schema)

  const clientMod = new ClientMod(client, schema, options)
  const keys = Object.keys(Object.getPrototypeOf(client))

  keys.forEach(key => {
    const method = client[key]
    client[key] = clientMod.mod(method)
  })
}
