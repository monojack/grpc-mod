import { isType, } from '../utils'

export default function enforceNumber (schema) {
  return response =>
    Object.entries(response).reduce((acc, [ key, value, ]) => {
      const context = schema[key].getTypeSchema()
      return {
        ...acc,
        [key]: isType('object', value)
          ? enforceNumber(context)(value)
          : isType('array', value)
            ? value.map(enforceNumber(context))
            : schema[key].type === 'int64' ? parseInt(value) : value,
      }
    }, {})
}
