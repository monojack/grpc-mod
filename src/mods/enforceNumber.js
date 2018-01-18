import { isType, } from '../utils'

export default function enforceNumber (doc) {
  return Object.entries(doc).reduce((acc, [ key, value, ]) => {
    const context = this[key].getTypeSchema()
    return {
      ...acc,
      [key]: isType('object', value)
        ? enforceNumber.call(context, value)
        : isType('array', value)
          ? value.map(enforceNumber.bind(context))
          : this[key].type === 'int64' ? parseInt(value) : value,
    }
  }, {})
}
