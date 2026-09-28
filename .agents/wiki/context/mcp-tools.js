// Checks the tool surface this server actually registers.
//
// `src/index.js` calls main() at module load, which connects a stdio transport to this
// process's stdin and stdout — so the surface is checked through `src/tools.js`, which is a
// pure function of a server object. The spy below records whichever registration method is
// called, so this file keeps working when the SDK migration moves `tool` to `registerTool`.
//
// This asserts on REGISTERED tools, not on source text. A grep over the source would be
// cheaper and would prove nothing: it cannot tell a registered tool from a comment about
// one, and it would happily pass while a description still lied.
//
//   node .agents/wiki/context/mcp-tools.js

import { registerTools, TOOL_NAMES } from '../../../src/tools.js';

let pass = 0;
let fail = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function eq(name, actual, expected) {
  check(name, actual === expected, `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

// --- a spy that records the registration calls ----------------------------

const registered = [];
const spy = {
  tool(name, description, schema, cb) {
    registered.push({ name, description, schema, cb, via: 'tool' });
  },
  registerTool(name, config, cb) {
    registered.push({
      name,
      description: config.description,
      schema: config.inputSchema,
      cb,
      via: 'registerTool',
    });
  },
};

const returned = registerTools(spy);
const byName = new Map(registered.map((t) => [t.name, t]));
const allDescriptions = registered.map((t) => t.description).join('\n');

// ---------------------------------------------------------------- the surface

console.log('\nThe tool surface');
eq('eight tools are registered', registered.length, 8);
eq('and the names are exactly these', registered.map((t) => t.name).join(', '), TOOL_NAMES.join(', '));
eq('registerTools reports the same list it registered', returned.join(', '), registered.map((t) => t.name).join(', '));

check('no tool is named create_new_project', !byName.has('create_new_project'));
check('nothing anywhere still mentions create_new_project',
  !/create_new_project/.test(allDescriptions), 'found in a tool description');

// A registration with no description is a tool a model cannot choose on the merits.
for (const t of registered) {
  check(`${t.name} has a description`, typeof t.description === 'string' && t.description.length > 20);
  check(`${t.name} has a handler`, typeof t.cb === 'function');
}

// ---------------------------------------------------------------- the enum

console.log('\nadd_member cannot grant admin');
const addMember = byName.get('add_member');
// Ask the schema which values it ACCEPTS, rather than reading its internals. The internal
// shape moved between zod 3 and zod 4, and the dependency upgrade is scheduled — a check
// written against `_def.values` would break on a version bump for reasons that have
// nothing to do with what it is checking. safeParse is the behaviour, and it is stable.
const roleSchema = addMember.schema.role;
const accepts = (v) => roleSchema.safeParse(v).success;
eq('editor is an accepted role', accepts('editor'), true);
eq('viewer is an accepted role', accepts('viewer'), true);
eq('admin is NOT an accepted role', accepts('admin'), false);
eq('an invented role is NOT accepted', accepts('superuser'), false);
check('the description points admin grants at the web app',
  /web app/i.test(addMember.description), addMember.description);

// ---------------------------------------------------------------- the claims

console.log('\nNo description claims a check cannot be bypassed');
for (const phrase of [
  'cannot be bypassed',
  'escalate privileges',
  'injection-proof',
  'injection proof',
  'owner/admin only',
  'owner or admin only',
]) {
  check(`no tool description says "${phrase}"`,
    !allDescriptions.toLowerCase().includes(phrase.toLowerCase()),
    'found in a tool description');
}

console.log('\nThe write tools name the scope that is actually enforced');
// canWrite in server-expressjs: the owner, or an editor or admin member.
for (const name of ['add_knowledge', 'upload_file', 'change_project_title', 'change_project_description']) {
  const d = byName.get(name).description.toLowerCase();
  check(`${name} says who can use it`,
    /write access/.test(d) || /owner, editor or admin/.test(d),
    byName.get(name).description);
  check(`${name} does not narrow it to owner or admin`, !/owner or admin/.test(d),
    byName.get(name).description);
}

// The reads must not claim a write scope they do not have, and the writes must not be
// described as owner-only the way they were before 2.0.0 opened them to an editor.
check('search_knowledge is not described as needing write access',
  !/write access/.test(byName.get('search_knowledge').description.toLowerCase()));
check('whoami is not described as needing write access',
  !/write access/.test(byName.get('whoami').description.toLowerCase()));

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
process.exit(fail === 0 ? 0 : 1);
