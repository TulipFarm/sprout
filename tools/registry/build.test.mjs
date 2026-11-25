import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { BASE_ITEM, buildRegistry, cssToObject, referencedClasses } from './build.mjs';

const { items } = await buildRegistry({ baseUrl: 'https://registry.test/r' });
const byName = new Map(items.map(item => [item.name, item]));

test('a repeated selector keeps its place in the cascade', () => {
  const css = cssToObject('.a { color: red; margin: 0 } .b { color: blue } .a { color: green }', 'test.css');
  assert.deepEqual(Object.keys(css), ['.a', '.b', ':is(.a)']);
  assert.equal(css[':is(.a)'].color, 'green');
});

test('every installed file has a unique basename', () => {
  // shadcn resolves an import to whichever installed file shares its basename.
  const owners = new Map();
  for (const item of items) {
    for (const file of item.files ?? []) {
      const base = path.basename(file.target).replace(/\.tsx?$/, '');
      assert.ok(
        !owners.has(base) || owners.get(base) === file.target,
        `${base}: ${owners.get(base)} and ${file.target}`,
      );
      owners.set(base, file.target);
    }
  }
});

test('each component and its registry dependencies style every Sprout class it uses', () => {
  const styled = new Set();
  const definedIn = item => {
    const classes = new Set();
    const walk = object => {
      for (const [key, value] of Object.entries(object ?? {})) {
        if (typeof value !== 'object') continue;
        for (const match of key.matchAll(/\.(sprout-[\w-]+)/g)) classes.add(match[1]);
        walk(value);
      }
    };
    walk(item.css);
    return classes;
  };
  for (const item of items) for (const className of definedIn(item)) styled.add(className);

  const dependencies = item => {
    const seen = new Set([item.name]);
    const queue = [item];
    while (queue.length) {
      for (const dep of queue.pop().registryDependencies ?? []) {
        const name = path.basename(dep, '.json');
        if (!seen.has(name)) {
          seen.add(name);
          queue.push(byName.get(name));
        }
      }
    }
    return seen;
  };

  for (const item of items.filter(item => item.type === 'registry:ui')) {
    const installed = new Set([...dependencies(item)].flatMap(name => [...definedIn(byName.get(name))]));
    const used = item.files.flatMap(file => [...referencedClasses(file.content)]);
    const missing = used.filter(className => styled.has(className) && !installed.has(className));
    assert.deepEqual([...new Set(missing)], [], `${item.name} is missing styles`);
    assert.ok(dependencies(item).has(BASE_ITEM));
  }
});
