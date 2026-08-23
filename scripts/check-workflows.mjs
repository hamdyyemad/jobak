/**
 * Parses every Code node in every n8n workflow.
 *
 * The workflows carry real JavaScript inside JSON strings, and n8n only finds a
 * syntax error when the node runs — which for a scheduled workflow means at
 * 03:00, silently, in a run nobody is watching. This parses each block up front.
 *
 * It also re-checks the graph: n8n keys connections by node name, so a rename
 * that misses one side leaves a dangling edge and the workflow simply stops
 * halfway with no error.
 *
 *   node scripts/check-workflows.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "n8n";
let failures = 0;

for (const file of readdirSync(DIR).filter((name) => name.endsWith(".json"))) {
  const path = join(DIR, file);
  let workflow;

  try {
    workflow = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.log(`FAIL  ${file} — not valid JSON: ${error.message}`);
    failures++;
    continue;
  }

  const nodes = workflow.nodes ?? [];
  const names = new Set(nodes.map((node) => node.name));
  const problems = [];

  // ── Code nodes must parse ──
  let codeNodes = 0;
  for (const node of nodes) {
    const code = node.parameters?.jsCode;
    if (typeof code !== "string") continue;
    codeNodes++;

    try {
      // `AsyncFunction` rather than `eval`: it compiles the body without
      // running it, and tolerates the top-level `await` n8n Code nodes allow.
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      new AsyncFunction(code);
    } catch (error) {
      problems.push(`Code node "${node.name}" does not parse: ${error.message}`);
    }
  }

  // ── The graph must not dangle ──
  for (const [source, outputs] of Object.entries(workflow.connections ?? {})) {
    if (!names.has(source)) problems.push(`connection from unknown node "${source}"`);
    for (const branches of Object.values(outputs)) {
      for (const branch of branches ?? []) {
        for (const link of branch ?? []) {
          if (!names.has(link.node)) problems.push(`connection to unknown node "${link.node}"`);
        }
      }
    }
  }

  if (problems.length) {
    failures += problems.length;
    console.log(`FAIL  ${file}`);
    for (const problem of problems) console.log(`        ${problem}`);
  } else {
    console.log(`ok    ${file.padEnd(34)} ${nodes.length} nodes, ${codeNodes} code`);
  }
}

console.log(`\n${failures === 0 ? "all workflows parse" : `${failures} PROBLEM(S)`}`);
process.exitCode = failures === 0 ? 0 : 1;
