// https://gist.github.com/amatiasq/2e4344792f28611fa499

export default function curryN (fn, length) {
  length = length || fn.length
  return function curried () {
    const args = [ ...arguments, ]

    if (args.length === 0) return curried

    if (args.length >= length) return fn.apply(this, args)

    const child = fn.bind.apply(fn, [ this, ].concat(args))
    return curryN(child, length - args.length)
  }
}
