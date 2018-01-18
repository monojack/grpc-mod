const { deepApplyMod, } = require('../../../')

module.exports = function unixToDateString (response, schema) {
  return deepApplyMod(response, schema, (v) => new Date(v).toString(), (key, value) =>
    [ 'created', 'completed', ].includes(key)
  )
}
