import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/app.mjs',import.meta.url),'utf8');
test('full dinner selection communicates why remaining cards cannot be added',()=>{
  assert.match(source,/draftDinnerIds\.length>=state\.nights/);
  assert.match(source,/Possible menu alternative; review to see which fit/);
  assert.match(source,/aria-disabled="\$\{unavailable\}"/);
});
test('full selection action explains how to make space',()=>{
  assert.match(source,/All \$\{settings\.nights\} dinner slots are filled\. Remove a selected meal/);
});
