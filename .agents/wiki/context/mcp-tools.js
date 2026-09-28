// Checks the tool surface this server actually registers.
//
// `src/index.js` calls main() at module load, which connects a stdio transport to this
// process's stdin and stdout — so the surface is checked through `src/tools.js`, which is a
// pure function of a server object.
//
// This asserts on REGISTERED tools, not on source text. A grep over the source would be
// cheaper and would prove nothing: it cannot tell a registered tool from a comment about
// one, and it would happily pass while a description still lied.
//
// It runs the surface two ways, because they fail differently:
//
//   1. Through a spy, which is the only way to read a description as authored and to ask a
//      zod schema which values it accepts. A spy accepts whatever object it is handed, so
//      it cannot tell a real SDK method from an invented one.
//   2. Through a real `McpServer` and a real `Client` over an in-memory transport, which is
//      the only way to know `registerTool` exists, that zod 4 schemas survive conversion to
//      JSON Schema, and what a client actually receives over the wire.
//
//   node .agents/wiki/context/mcp-tools.js

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

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
const deprecatedCalls = [];
const spy = {
  registerTool(name, config, cb) {
    registered.push({ name, description: config.description, schema: config.inputSchema, cb });
  },
  // The old registration form. The SDK marks `server.tool()` deprecated on every overload,
  // so a call landing here is a regression rather than a compatibility shim. It is
  // recorded instead of throwing, so the failure names the regression instead of a
  // TypeError from deep inside the check.
  tool(...args) {
    deprecatedCalls.push(args[0]);
    return undefined;
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
eq('nothing was registered through the deprecated tool() form', deprecatedCalls.length, 0);
if (deprecatedCalls.length) console.log(`       called with: ${deprecatedCalls.join(', ')}`);

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
// shape moved between zod 3 and zod 4, and the check is written to outlive the bump — a
// check against `_def.values` would have broken on zod 4 for reasons that have nothing to
// do with what it is checking. safeParse is the behaviour, and it is stable.
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

// ------------------------------------------------- a real client, a real server
//
// Everything above is read through a spy, and a spy would report the same eight tools if
// `registerTool` were not a method the SDK actually has. This section is the one that
// cannot be fooled that way: it builds a real McpServer, registers the surface on it,
// connects a real Client across an in-memory transport, and asks the server what it
// offers. If the migration were wrong — the method renamed, the config key misspelled, the
// zod 4 schemas unconvertible — the request fails here rather than passing quietly.

console.log('\nA real client sees the surface this server registered');

const realServer = new McpServer({ name: 'mcp-rag-server-surface-check', version: '0.0.0-check' });
registerTools(realServer);

// Connect the SERVER first. `client.connect` waits on an initialize handshake, and the
// server is what answers it, so connecting the client first deadlocks until the request
// times out — which is a confusing way to learn the ordering.
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await realServer.connect(serverTransport);
const realClient = new Client({ name: 'surface-check', version: '0.0.0-check' });
await realClient.connect(clientTransport);

const listed = (await realClient.listTools()).tools;
const listedNames = listed.map((t) => t.name);

eq('a connected client is offered eight tools', listed.length, 8);
eq('and they are the same eight, in the same order', listedNames.join(', '), TOOL_NAMES.join(', '));

for (const t of listed) {
  check(`${t.name} reaches the client with a description`,
    typeof t.description === 'string' && t.description.length > 20,
    `got ${JSON.stringify(t.description)}`);
}

// The spy proves the enum as authored; this proves it as delivered. A zod 4 upgrade that
// loosened the schema, or an SDK that stopped converting it, would show up here and
// nowhere else.
const wireAddMember = listed.find((t) => t.name === 'add_member');
const wireRole = wireAddMember.inputSchema.properties.role;
eq('the wire schema offers exactly two roles', wireRole.enum.length, 2);
check('and admin is not one of them', !wireRole.enum.includes('admin'),
  `enum is ${JSON.stringify(wireRole.enum)}`);
check('editor and viewer both survive zod 4 conversion',
  wireRole.enum.includes('editor') && wireRole.enum.includes('viewer'),
  `enum is ${JSON.stringify(wireRole.enum)}`);

// zod 4 across a major boundary is exactly where a constraint is quietly dropped, so check
// the constraints a caller would rely on rather than trusting that they were carried over.
const wireSearch = listed.find((t) => t.name === 'search_knowledge').inputSchema;
eq('search_knowledge requires its query', JSON.stringify(wireSearch.required), '["query"]');
eq('and its limit stays optional',
  Object.prototype.hasOwnProperty.call(wireSearch.properties, 'limit'), true);
eq('the limit bounds survive as integers', wireSearch.properties.limit.type, 'integer');
eq('the lower bound survives', wireSearch.properties.limit.minimum, 1);
eq('the upper bound survives', wireSearch.properties.limit.maximum, 25);

const wireUpload = listed.find((t) => t.name === 'upload_file').inputSchema;
eq('upload_file requires only the filename', JSON.stringify(wireUpload.required), '["filename"]');
check('and still offers content_base64, snake case as MCP expects',
  Object.prototype.hasOwnProperty.call(wireUpload.properties, 'content_base64'));

// The three no-argument tools must arrive as such. A schema that leaked an argument would
// let a model send one and hang on a call that can never succeed.
for (const name of ['whoami', 'get_project']) {
  const s = listed.find((t) => t.name === name).inputSchema;
  eq(`${name} takes no arguments`, Object.keys(s.properties || {}).length, 0);
}

await realClient.close();
await realServer.close();

console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
process.exit(fail === 0 ? 0 : 1);
