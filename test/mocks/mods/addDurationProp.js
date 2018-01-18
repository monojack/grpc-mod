const { Interval, } = require('luxon')
const { isType, } = require('../../../lib/utils')

module.exports = function addDurationProp (response, schema) {
  return Object.entries(response).reduce((acc, [ key, value, ]) => {
    return !isType('array', value) ? {
      ...response,
      ...(response.completed && {
        duration: (() => {
          const { hours, minutes, } = Interval.fromDateTimes(
            new Date(response.created),
            new Date(response.completed)
          )
            .toDuration([ 'hours', 'minutes', ])
            .toObject()

          return `${hours} hours and ${Math.round(minutes)} minutes`
        })(),
      }),
    } : {
      ...response,
      [key]: value.map(v => addDurationProp(v, schema)),
    }
  }, {})
}
