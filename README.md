# path-value-extractor

Given a dot/bracket path string and a root object, returns the value at that path plus a boolean indicating whether the path existed.

## Usage

```js
import { extractValue } from 'path-value-extractor';

const root = { users: [{ name: 'ada' }] };
const { value, exists } = extractValue('users[0].name', root);
// value === 'ada', exists === true
```

## Why this exists

Lodash's `_.get` returns a single value, so `undefined` is ambiguous: it can mean \"the key was missing\" or \"the key was present but its value was undefined\". This library returns `{ value, exists }` so a caller can tell those apart. The trade-off is a slightly more verbose call site.

The path grammar supports dot segments (`a.b`), bracket segments (`a[0]`), and quoted bracket segments (`['weird.key']`). Quoted keys support backslash escaping of the surrounding quote character. Leading dots are tolerated; an otherwise-empty path returns the root object.

## The awkward edge

An explicit `undefined` stored at a path still reports `exists: true`. If you want \"truthy and present\", check both `exists` and `value != null`.

A syntactically broken path (e.g. an unterminated bracket) is treated as a non-existent path: `extractValue` returns `{ value: undefined, exists: false }`. If you need to surface syntax errors to the user, call `parsePath` directly — it throws `SyntaxError` on malformed input.
