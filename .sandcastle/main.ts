// Parallel Planner — three-phase orchestration loop
//
// This template drives a multi-phase workflow:
//   Phase 1 (Plan):    An opus agent analyzes open issues, builds a dependency
//                      graph, and outputs a <plan> JSON listing unblocked issues
//                      with their target branch names.
//   Phase 2 (Execute): N sonnet agents run in parallel via Promise.allSettled,
//                      each working a single issue on its own branch.
//   Phase 3 (Merge):   A sonnet agent merges all branches that produced commits.
//
// The outer loop repeats up to MAX_ITERATIONS times so that newly unblocked
// issues are picked up after each round of merges.
//
// Usage:
//   npx tsx .sandcastle/main.ts
// Or add to package.json:
//   "scripts": { "sandcastle": "npx tsx .sandcastle/main.ts" }

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const MAX_ITERATIONS = 100;
const MAX_PARALLEL = 4;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const hooks = {
  sandbox: {
    onSandboxReady: [
      { command: 'mkdir -p "$CODEX_HOME" && cp /mnt/codex-auth/auth.json "$CODEX_HOME/auth.json"' },
      { command: "npm install" },
    ]
  },
};

const copyToWorktree = ["node_modules"];

const codexDockerSandbox = docker({
  env: {
    CODEX_HOME: "/home/agent/workspaces/.sandcastle/codex-home",
  },
  mounts: [
    {
      hostPath: "~/.codex/auth.json",
      sandboxPath: "/mnt/codex-auth/auth.json",
      readonly: true,
    }
  ],
  hooks,
  copyToWorktree,
});

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  //
  // The planning agent (opus, for deeper reasoning) reads the open issue list,
  // builds a dependency graph, and selects the issues that can be worked in
  // parallel right now (i.e., no blocking dependencies on other open issues).
  //
  // It outputs a <plan> JSON block — we parse that to drive Phase 2.
  // -------------------------------------------------------------------------
  const plan = await sandcastle.run({
    hooks,
    sandbox: codexDockerSandbox,
    name: "planner",
    maxIterations: 1,
    //agent: sandcastle.claudeCode("claude-opus-4-6"),
    agent: sandcastle.codex("gpt-5.5", { effort: "high" }),
    promptFile: "./.sandcastle/plan-prompt.md",
  });

  // Extract the <plan>…</plan> block from the agent's stdout.
  const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
  if (!planMatch) {
    throw new Error(
      "Planning agent did not produce a <plan> tag.\n\n" + plan.stdout,
    );
  }

  // The plan JSON contains an array of issues, each with number, title, branch.
  const { issues } = JSON.parse(planMatch[1]!) as {
    issues: { number: number; title: string; branch: string }[];
  };

  if (issues.length === 0) {
    // No unblocked work — either everything is done or everything is blocked.
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(
    `Planning complete. ${issues.length} issue(s) to work in parallel:`,
  );
  for (const issue of issues) {
    console.log(`  #${issue.number}: ${issue.title} → ${issue.branch}`);
  }

  let running = 0;
  const queue: (() => void)[] = [];
  const acquire = () =>
    running < MAX_PARALLEL
      ? (running++, Promise.resolve())
      : new Promise<void>((resolve) => queue.push(resolve));

  const release = () => {
    running--;
    const next = queue.shift();
    if (next) {
      running++;
      next();
    }
  };

  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      await acquire();

      try {
        await using sandbox = await sandcastle.createSandbox({
          sandbox: codexDockerSandbox,
          branch: issue.branch,
          hooks,
          copyToWorktree,
        });

        const result = await sandbox.run({
          name: "implementer #" + issue.number,
          maxIterations: 300,
          agent: sandcastle.codex("gpt-5.4", { effort: "high" }),
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: {
            TASK_ID: String(issue.number),
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
          },
          // Each agent starts on its own branch.
          idleTimeoutSeconds: 600,
        });

        if (result.commits.length > 0) {
          await sandbox.run({
            name: "Reviewer #" + issue.number,
            agent: sandcastle.codex("gpt-5.5", { effort: "high" }),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: {
              TASK_ID: String(issue.number),
              ISSUE_TITLE: issue.title,
              BRANCH: issue.branch,
            },
            idleTimeoutSeconds: 600,
          });
        }

        return result;
      } finally {
        release();
      }
    }),
  );

  // Log any agents that threw (network error, sandbox crash, etc.).
  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(
        `  ✗ #${issues[i]!.number} (${issues[i]!.branch}) failed: ${outcome.reason}`,
      );
    }
  }

  // Only pass branches that actually produced commits to the merge phase.
  // An agent that ran successfully but made no commits has nothing to merge.
  const completedIssues = settled
    .map((outcome, i) => ({ outcome, issue: issues[i]! }))
    .filter(
      (
        entry,
      ): entry is {
        outcome: PromiseFulfilledResult<
          Awaited<ReturnType<typeof sandcastle.run>>
        >;
        issue: (typeof issues)[number];
      } =>
        entry.outcome.status === "fulfilled" &&
        entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  const completedBranches = completedIssues.map((i) => i.branch);

  console.log(
    `\nExecution complete. ${completedBranches.length} branch(es) with commits:`,
  );
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    // All agents ran but none made commits — nothing to merge this cycle.
    console.log("No commits produced. Nothing to merge.");
    continue;
  }

  // -------------------------------------------------------------------------
  // Phase 3: Merge
  //
  // One sonnet agent merges all completed branches into the current branch,
  // resolving any conflicts and running tests to confirm everything still works.
  //
  // The {{BRANCHES}} and {{ISSUES}} prompt arguments are lists that the agent
  // uses to know which branches to merge and which issues to close.
  // -------------------------------------------------------------------------
  await sandcastle.run({
    sandbox: codexDockerSandbox,
    name: "merger",
    maxIterations: 10,
    agent: sandcastle.codex("gpt-5.5", { effort: "high" }),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: completedBranches.map((b) => `- ${b}`).join("\n"),
      ISSUES: completedIssues
        .map((i) => `- #${i.number}: ${i.title}`)
        .join("\n"),
    },
  });

  console.log("\nBranches merged.");
}

console.log("\nAll done.");
