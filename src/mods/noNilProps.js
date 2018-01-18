import { isType, } from '../utils'

export default function noNilProps (doc) {
  return Object.entries(doc).reduce((acc, [ key, value, ]) => {
    if (value == null) return acc
    return {
      ...acc,
      [key]: isType('object', value)
        ? noNilProps(value)
        : isType('array', value) ? value.map(noNilProps) : value,
    }
  }, {})
}
