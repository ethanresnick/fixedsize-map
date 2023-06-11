import { describe, it } from "node:test";
import * as assert from "node:assert";
import SizeLimitedMap from "./index.js";
import * as fc from "fast-check";

type Model = { maxSize: number };

const SetCommand = <K, V>(k: K, v: V) => ({
  check: () => true,
  toString: () => `set(${k}, ${v})`,
  run(m: Model, r: SizeLimitedMap<K, V>) {
    r.set(k, v);
    assert.ok(r.size <= m.maxSize, "Size limit exceeded.");
    assert.ok(r.has(k), "Key not set.");
    assert.strictEqual(r.get(k), v, "Key had wrong value.");
  },
});

const DeleteCommand = <K>(k: K) => ({
  check: () => true,
  run(_m: Model, r: SizeLimitedMap<K, unknown>) {
    const size = r.size;
    const deleted = r.delete(k);
    assert.strictEqual(r.size, deleted ? size - 1 : size, "Size mismatch.");
    assert.strictEqual(r.has(k), false, "Key not deleted.");
  },
  toString: () => `delete(${k})`,
});

describe("FixedSizeMap", () => {
  it("should respect the size limit", () => {
    const map = new SizeLimitedMap(3);
    map.set("a", 1);
    map.set("b", 2);
    map.set("c", 3);
    map.set("d", 4);

    assert.strictEqual(map.size, 3);
    assert.strictEqual(map.has("a"), false);
    assert.strictEqual(map.has("b"), true);
    assert.strictEqual(map.has("c"), true);
    assert.strictEqual(map.has("d"), true);

    map.delete("b");
    map.delete("c");
    map.delete("d");
    assert.strictEqual(map.size, 0);

    map.set("e", 5);
    assert.strictEqual(map.size, 1);
    assert.strictEqual(map.has("e"), true);

    const map2 = new SizeLimitedMap(1);
    map2.set("a", 1);
    map2.set("b", 2);
    assert.strictEqual(map2.size, 1);
    assert.strictEqual(map2.has("a"), false);
    assert.strictEqual(map2.has("b"), true);
    map2.delete("b");
    map2.set("c", 2);
    map2.set("d", 2);
    assert.strictEqual(map2.size, 1);
    assert.strictEqual(map2.has("c"), false);
    assert.strictEqual(map2.has("d"), true);
  });

  it("should respect the size limit (using a model test)", () => {
    // define the possible commands and their inputs
    const keyOpts = { minLength: 1, maxLength: 2 };
    const allCommands = [
      fc
        .tuple(fc.string(keyOpts), fc.integer())
        .map(([k, v]) => SetCommand(k, v)),
      fc.string(keyOpts).map((it) => DeleteCommand(it)),
    ];

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.commands(allCommands, { size: "+1" }),
        (size, cmds) => {
          fc.modelRun(
            () => ({
              model: { maxSize: size },
              real: new SizeLimitedMap(size),
            }),
            cmds
          );
        }
      )
    );
  });
});
