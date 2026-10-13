// tiny-project-coordinator: scope a goal into threads, share memory, assemble results.
// Example goals, files, and thread caps only. No model call. No network.

type Fact = { key: string; value: string; by: string };

type ThreadPlan = { id: string; title: string; files: string[] };

type Thread = ThreadPlan & {
  status: "queued" | "running" | "done" | "blocked";
  result?: string;
  reason?: string;
};

type Project = {
  name: string;
  goal: string;
  memory: Fact[];
  threads: Thread[];
  dailyCap: number;
  startedToday: number;
  claimed: Map<string, string>; // file -> thread id
};

function remember(p: Project, key: string, value: string, by: string) {
  const i = p.memory.findIndex((f) => f.key === key);
  const fact = { key, value, by };
  if (i >= 0) p.memory[i] = fact;
  else p.memory.push(fact);
}

function recall(p: Project, key: string): string | undefined {
  return p.memory.find((f) => f.key === key)?.value;
}

// Mocked scoping. A real coordinator would ask a model. We hardcode two demos.
function scope(goal: string): ThreadPlan[] {
  if (goal.includes("v1 checkout")) {
    return [
      { id: "api", title: "migrate API callers off v1", files: ["api/routes/checkout.ts", "api/clients/v1.ts"] },
      { id: "web", title: "point web checkout at v2", files: ["web/checkout.tsx", "web/api.ts"] },
      { id: "mobile", title: "point mobile checkout at v2", files: ["mobile/Checkout.tsx", "mobile/api.ts"] },
      { id: "docs", title: "mark v1 deprecated in docs", files: ["docs/checkout.md"] },
    ];
  }
  if (goal.includes("p75")) {
    return [
      { id: "profile", title: "profile checkout endpoints", files: ["api/routes/checkout.ts"] },
      { id: "cache", title: "add response cache for catalog", files: ["api/cache.ts", "api/routes/catalog.ts"] },
      { id: "query", title: "trim checkout SQL", files: ["api/db/checkout.sql", "api/routes/checkout.ts"] },
    ];
  }
  return [{ id: "solo", title: "handle the whole goal", files: ["README.md"] }];
}

function openThreads(p: Project, plans: ThreadPlan[]): string[] {
  const notes: string[] = [];
  for (const plan of plans) {
    if (p.startedToday >= p.dailyCap) {
      p.threads.push({ ...plan, status: "queued", reason: `daily thread cap ${p.dailyCap} hit` });
      notes.push(`[QUEUE] ${plan.id}  daily cap ${p.dailyCap} hit`);
      continue;
    }
    p.threads.push({ ...plan, status: "running" });
    p.startedToday += 1;
    notes.push(`[START] ${plan.id}  ${plan.title}`);
  }
  return notes;
}

function claimFiles(p: Project, t: Thread): string | null {
  const taken = t.files.filter((f) => p.claimed.has(f) && p.claimed.get(f) !== t.id);
  if (taken.length > 0) {
    const owners = [...new Set(taken.map((f) => p.claimed.get(f)!))];
    return `files claimed by ${owners.join(", ")}: ${taken.join(", ")}`;
  }
  for (const f of t.files) p.claimed.set(f, t.id);
  return null;
}

function runThread(p: Project, t: Thread): string {
  const clash = claimFiles(p, t);
  if (clash) {
    t.status = "blocked";
    t.reason = clash;
    return `[BLOCK] ${t.id}  ${t.reason}`;
  }

  const deadline = recall(p, "release") ?? "unset";
  t.status = "done";
  t.result = `${t.title} (release ${deadline})`;
  remember(p, `done:${t.id}`, t.result, t.id);
  if (t.id === "profile") remember(p, "hotspot", "POST /checkout confirm", t.id);
  if (t.id === "api") remember(p, "v1-callers", "3 remaining in api/", t.id);
  return `[DONE ] ${t.id}  ${t.result}`;
}

function assemble(p: Project): string {
  const done = p.threads.filter((t) => t.status === "done");
  const blocked = p.threads.filter((t) => t.status === "blocked");
  const queued = p.threads.filter((t) => t.status === "queued");
  const lines = [
    `project: ${p.name}`,
    `goal: ${p.goal}`,
    `memory: ${p.memory.map((f) => `${f.key}=${f.value}`).join("; ") || "(empty)"}`,
    `done: ${done.map((t) => t.id).join(", ") || "(none)"}`,
    `blocked: ${blocked.map((t) => `${t.id} (${t.reason})`).join("; ") || "(none)"}`,
    `queued: ${queued.map((t) => t.id).join(", ") || "(none)"}`,
  ];
  return lines.join("\n");
}

function fresh(name: string, goal: string, dailyCap: number): Project {
  return { name, goal, memory: [], threads: [], dailyCap, startedToday: 0, claimed: new Map() };
}

// ===== EXAMPLE INPUTS (made-up goals, files, and caps) =====
console.log("tiny-project-coordinator demo\n");

console.log("=== demo 1: retire v1 checkout (cap 3) ===");
const retire = fresh(
  "checkout-v2",
  "retire v1 checkout endpoint across api, web, and mobile",
  3,
);
remember(retire, "release", "Friday", "human");
for (const note of openThreads(retire, scope(retire.goal))) console.log(note);
for (const t of retire.threads.filter((x) => x.status === "running")) console.log(runThread(retire, t));
console.log("\nassembled:\n" + assemble(retire));

console.log("\n=== demo 2: cut p75 (overlap on checkout.ts) ===");
const p75 = fresh("checkout-perf", "reduce checkout p75 latency", 10);
remember(p75, "release", "next Tue", "human");
for (const note of openThreads(p75, scope(p75.goal))) console.log(note);
for (const t of p75.threads.filter((x) => x.status === "running")) console.log(runThread(p75, t));
console.log("\nassembled:\n" + assemble(p75));
