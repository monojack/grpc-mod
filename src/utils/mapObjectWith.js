export default function mapObjectWith (predicate = () => true) {
  return transform => obj =>
    Object.entries(obj).reduce(
      (acc, [ key, value, ]) => ({
        ...acc,
        [key]: predicate(key, value) ? transform(value) : value,
      }),
      {}
    )
}
