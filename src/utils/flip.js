export default function flip (fn) {
  return function () {
    const args = [ ...arguments, ].reverse()
    return fn.call(this, ...args)
  }
}
