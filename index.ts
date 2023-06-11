type MapLike<K, V> = Pick<
  Map<K, V>,
  "get" | "has" | "clear" | "delete" | "size" | "entries" | "keys" | "values"
> & {
  set: (key: K, value: V) => MapLike<K, V>;
  forEach: (
    cb: (value: V, key: K, map: MapLike<K, V>) => void,
    thisArg?: unknown
  ) => void;
};

/**
 * This class works like the built-in JS Map class, except that it has a fixed
 * max size; if a new element is added once that size is reached, the oldest
 * entry will be dropped. Because entries may be deleted as new ones are set,
 * the map iterators may give strange behavior if items are set during
 * iteration.
 *
 * It doesn't extend Map because it can't, by definition, satisfy the behavioral
 * invariant of a map that `set(x, y)`, followed by any number of operations
 * that don't delete or overwrite key `x`, followed by `get(x)`, will return `y`.
 */
export default class SizeLimitedMap<K, V> implements MapLike<K, V> {
  private readonly maxSize: number;
  private readonly map: Map<K, V>;
  private keysIterator: IterableIterator<K>;

  /**
   * The max number of keys this cache can hold
   * @param {number} maxSize
   */
  constructor(maxSize: number, entries?: readonly (readonly [K, V])[]) {
    if (typeof maxSize !== "number" || Number.isNaN(maxSize))
      throw new Error("Cache size must be a number");

    if (maxSize < 1 || !Number.isFinite(maxSize))
      throw new Error("Cache size must at least be 1, and finite.");

    this.maxSize = maxSize;
    this.map = new Map(entries);
    this.keysIterator = this.map.keys();
  }

  /**
   * Sets, or overwrites, the value for a key.
   * If the Map is already full, this will remove the oldest element.
   */
  set(key: K, value: V) {
    if (this.map.has(key)) {
      this.map.set(key, value);
      return this;
    }

    if (this.map.size >= this.maxSize) {
      this.map.delete(this.keysIterator.next().value);
    }

    this.map.set(key, value);
    return this;
  }

  // Delegate the remaining methods to the underlying map.
  // forEach is the only tricky one.
  forEach(
    cb: (value: V, key: K, map: SizeLimitedMap<K, V>) => void,
    thisArg?: unknown
  ) {
    const cbBound = cb.bind(thisArg);
    this.map.forEach((v, k) => cbBound(v, k, this));
  }

  get size() {
    return this.map.size;
  }
  get(key: K) {
    return this.map.get(key);
  }
  has(key: K) {
    return this.map.has(key);
  }
  delete(key: K) {
    return this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
  entries() {
    return this.map.entries();
  }
  keys() {
    return this.map.keys();
  }
  values() {
    return this.map.values();
  }
}
