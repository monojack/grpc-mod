import { isType, } from './utils'

export default function deepApplyMod (
  response = {},
  schema = {},
  transform = () => {},
  predicate = true
) {
  return Object.entries(response).reduce((acc, [ key, value, ]) => {
    const context = (schema || {})[key] ? schema[key].getTypeSchema() : schema

    return {
      ...acc,
      [key]: isType('object', value)
        ? deepApplyMod(value, context, transform, predicate)
        : isType('array', value)
          ? value.map(i => deepApplyMod(i, context, transform, predicate))
          : (isType('function', predicate) ? predicate(key, value) : predicate)
            ? transform(value)
            : value,
    }
  }, {})
}
