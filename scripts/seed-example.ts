// Seeds the public example board via the PRODUCTION API.
// Run: npx tsx --env-file=.env.local scripts/seed-example.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { generateImage, generateText, Output } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const BASE = "https://blindspot-sable.vercel.app";
const ROOT = process.cwd();
const IDEAS_FILE = path.join(ROOT, "scripts", "example-ideas.json");
const SPEAKERS = ["Maya", "Leo", "Priya", "Sam", "Jordan", "Ana"];
const PROMPT = "How might we make a new hire's first week great?";

const PHOTOS = [
  { name: "team-lunch", caption: "A team eating lunch together around a long table in a bright office", prompt: "candid photo of a small team having lunch together at a long table in a bright modern office, a new colleague smiling" },
  { name: "welcome-kit", caption: "A welcome kit on a desk with a notebook, mug, stickers and a laptop", prompt: "photo of a welcome kit on an office desk: notebook, branded mug, stickers, tote bag and a closed laptop, natural light" },
  { name: "mentor-whiteboard", caption: "A mentor and a new hire standing at a whiteboard covered in diagrams", prompt: "photo of an experienced engineer and a new hire standing at a whiteboard with diagrams, discussing, modern office" },
  { name: "setup-checklist", caption: "A laptop screen showing a setup checklist with several items ticked", prompt: "photo of a laptop screen showing a software setup checklist with some boxes ticked, desk with coffee, shallow depth of field" },
  { name: "org-chart", caption: "A printed org chart on a wall with colorful sticky notes on it", prompt: "photo of a printed org chart pinned on a wall with colorful sticky notes attached to names" },
  { name: "remote-call", caption: "A new hire on a video call with team members in a home office", prompt: "photo over the shoulder of a person on a video call with four smiling teammates on a laptop in a cozy home office" },
  { name: "office-tour", caption: "A person leading a small group on a tour through an open-plan office", prompt: "photo of an employee showing a new hire around an open-plan office, pointing at a kitchen area, other people working in background" },
  { name: "plan-30-60-90", caption: "A hand-drawn 30-60-90 day plan sketched on paper", prompt: "top-down photo of a hand-drawn 30-60-90 day plan on notebook paper with three columns, pen beside it, on a wooden desk" },
  { name: "coffee-chat", caption: "Two colleagues talking over coffee in an office kitchen", prompt: "candid photo of two colleagues having a coffee chat in a sunny office kitchen, mugs in hand, relaxed" },
  { name: "first-pr", caption: "A team gathered around a screen showing a merged pull request, applauding", prompt: "photo of a team of developers gathered around a monitor showing a green merged pull request, clapping and smiling, office" },
];
const TOUR = [
  { name: "buddy-pairing", caption: "Two people pairing at one desk, one coaching the other on a laptop" },
  { name: "first-day-desk", caption: "A tidy desk set up for a first day with a laptop and welcome card" },
  { name: "phone-checklist", caption: "Phone showing an onboarding checklist with a progress bar" },
  { name: "sticky-wall", caption: "Sticky notes on a glass wall with short product-flow ideas" },
  { name: "whiteboard-sketch", caption: "Whiteboard sketch of a flow: sign up, welcome, first project" },
];
const LINK_QUERIES = [
  "new hire onboarding buddy program research",
  "first week onboarding best practices engineering",
  "remote onboarding employee experience study",
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function ensureIdeas(): Promise<string[]> {
  if (existsSync(IDEAS_FILE)) return JSON.parse(readFileSync(IDEAS_FILE, "utf8"));
  const result = await generateText({
    model: "anthropic/claude-sonnet-5-5",
    output: Output.object({ schema: z.object({ ideas: z.array(z.string()) }) }),
    prompt: `Write 205 sample brainstorm sticky-note ideas (3-14 words each, casual, human, varied voice, no numbering) for the prompt "${PROMPT}". This is demo data for a brainstorming tool.
Cover ~10 clusters roughly evenly: paperwork & accounts, laptop/tools setup, buddy/mentoring, team rituals & social, learning & docs, first real task/shipping, manager 1:1s, culture & values, remote/hybrid, feedback & surveys.
Heavily skew toward incremental, individual-level, safe ideas (checklists, emails, docs, reminders). Include exactly ~6 near-duplicates of other ideas (reworded), ~5 odd outliers (quirky, loosely related), and only ~8 genuinely radical or deeply social ideas (e.g. community-wide, restructuring who onboards whom) so that area stays sparse. Shuffle the order so clusters are mixed.`,
  });
  const ideas = result.output.ideas.map(s => s.trim()).filter(Boolean);
  writeFileSync(IDEAS_FILE, JSON.stringify(ideas, null, 2));
  return ideas;
}

async function ensurePhotos() {
  mkdirSync(path.join(ROOT, "public", "example"), { recursive: true });
  await Promise.all(PHOTOS.map(async p => {
    const out = path.join(ROOT, "public", "example", `${p.name}.jpg`);
    if (existsSync(out)) return;
    const { image } = await generateImage({ model: "bfl/flux-2-pro", prompt: p.prompt });
    const raw = path.join(ROOT, "public", "example", `${p.name}.raw`);
    writeFileSync(raw, image.uint8Array);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-vf", "scale='min(1024,iw)':-2", "-q:v", "5", out]);
    execFileSync("rm", [raw]);
  }));
}

async function uploadImages() {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const bucket = client.storage.from("idea-media");
  const items = [
    ...PHOTOS.map(p => ({ ...p, file: path.join(ROOT, "public", "example", `${p.name}.jpg`), ct: "image/jpeg", key: `example/${p.name}.jpg` })),
    ...TOUR.map(p => ({ ...p, file: path.join(ROOT, "public", "tour", `${p.name}.jpeg`), ct: "image/jpeg", key: `example/${p.name}.jpg` })),
  ];
  return Promise.all(items.map(async it => {
    const { error } = await bucket.upload(it.key, readFileSync(it.file), { contentType: it.ct, upsert: true });
    if (error) throw new Error(`upload ${it.key}: ${error.message}`);
    return { mediaType: "image" as const, mediaUrl: bucket.getPublicUrl(it.key).data.publicUrl, caption: it.caption };
  }));
}

async function links() {
  const out: { title: string; url: string; caption: string }[] = [];
  for (const query of LINK_QUERIES) {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": process.env.EXA_API_KEY!, "content-type": "application/json" },
      body: JSON.stringify({ query, numResults: 1, contents: { highlights: { numSentences: 2 } } }),
    });
    if (!res.ok) throw new Error(`exa ${res.status}`);
    const r = (await res.json()).results?.[0];
    if (!r) continue;
    const title = String(r.title ?? r.url).slice(0, 120);
    const hl = String((r.highlights ?? [])[0] ?? "").replace(/\s+/g, " ");
    out.push({ title, url: r.url, caption: `${title} — ${hl}`.slice(0, 400) });
  }
  return out;
}

async function post(url: string, body: unknown): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok || attempt >= 1 || !(res.status === 429 || res.status >= 500)) return res;
    await sleep(5000);
  }
}

type Item = { text: string; media: { mediaType: "image" | "link"; mediaUrl: string; caption: string } | null; source: "typed" | "photo"; speaker: string };

async function main() {
  const t0 = Date.now();
  const ideas = await ensureIdeas();
  console.log("ideas", ideas.length);
  await ensurePhotos();
  const [images, linkPts] = await Promise.all([uploadImages(), links()]);
  console.log("images", images.length, "links", linkPts.length);

  const create = await post(`${BASE}/api/sessions`, { prompt: PROMPT, teamName: "Example board" });
  if (!create.ok) throw new Error(`create session ${create.status} ${await create.text()}`);
  const { sessionId } = await create.json();
  console.log("sessionId", sessionId);

  const items: Item[] = ideas.map((text, i) => ({ text, media: null, source: "typed", speaker: SPEAKERS[i % SPEAKERS.length] }));
  const extras: Item[] = [
    ...images.map((m, i): Item => ({ text: "", media: m, source: "photo", speaker: SPEAKERS[(i + 2) % SPEAKERS.length] })),
    ...linkPts.map((l, i): Item => ({ text: l.title.slice(0, 280), media: { mediaType: "link", mediaUrl: l.url, caption: l.caption }, source: "typed", speaker: SPEAKERS[i] })),
  ];
  // interleave extras evenly through the idea stream
  const step = Math.floor(items.length / (extras.length + 1));
  extras.forEach((e, i) => items.splice((i + 1) * step + i, 0, e));

  for (let i = 0; i < items.length; i += 20) {
    const batch = items.slice(i, i + 20);
    // API takes one source/speaker per request: group by (source, speaker) within the batch
    const groups = new Map<string, Item[]>();
    for (const it of batch) {
      const k = `${it.source}|${it.speaker}`;
      groups.set(k, [...(groups.get(k) ?? []), it]);
    }
    for (const [, g] of groups) {
      const body = { texts: g.map(x => x.text), media: g.map(x => x.media), source: g[0].source, speaker: g[0].speaker };
      const res = await post(`${BASE}/api/sessions/${sessionId}/ideas`, body);
      if (!res.ok) console.error("batch failed", i, res.status, (await res.text()).slice(0, 200));
      await sleep(1200);
    }
    console.log("posted", Math.min(i + 20, items.length), "/", items.length);
  }

  const state = await (await fetch(`${BASE}/api/sessions/${sessionId}/state`)).json();
  const all = state.ideas ?? [];
  console.log("FINAL sessionId", sessionId, "ideas", all.length, "images", all.filter((x: { mediaType?: string }) => x.mediaType === "image").length, "secs", Math.round((Date.now() - t0) / 1000));
}
main().catch(e => { console.error(e); process.exit(1); });
