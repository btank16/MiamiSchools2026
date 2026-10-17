import { test } from "node:test";
import assert from "node:assert/strict";
import type Anthropic from "@anthropic-ai/sdk";
import { INFANT, KINDERGARTEN, PREK, filterSchools, loadSchools, parseCsv, parseGradeQuery, parseGrades } from "../src/schools.ts";
import { runTool, toolDefinitions } from "../src/tools.ts";
import { ChatSession } from "../src/bot.ts";

const schools = loadSchools();

test("loads every row of schools.csv", () => {
  assert.equal(schools.length, 1677);
  const byType = Object.groupBy(schools, (s) => s.type);
  assert.equal(byType.Public?.length, 358);
  assert.equal(byType.Charter?.length, 180);
  assert.equal(byType.Private?.length, 949);
  assert.equal(byType["Head Start"]?.length, 86);
  assert.equal(byType["Early Head Start"]?.length, 104);
  assert.ok(schools.every((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon)));
});

test("parses quoted CSV fields", () => {
  assert.deepEqual(parseCsv('a,b\n"x, y","say ""hi"""\n'), [["a", "b"], ["x, y", 'say "hi"']]);
});

test("parses the grade formats in the data", () => {
  assert.deepEqual(parseGrades("PK-05"), { low: PREK, high: 5 });
  assert.deepEqual(parseGrades("KG-12"), { low: KINDERGARTEN, high: 12 });
  assert.deepEqual(parseGrades("Infant-PK"), { low: INFANT, high: PREK });
  assert.deepEqual(parseGrades("05-K"), { low: KINDERGARTEN, high: 5 });
  assert.deepEqual(parseGrades("PK6-12"), { low: PREK, high: 12 });
  assert.deepEqual(parseGrades("K-G12"), { low: KINDERGARTEN, high: 12 });
  assert.deepEqual(parseGrades("18-PK"), { low: INFANT, high: PREK });
  assert.equal(parseGrades(""), null);
  const unparsed = schools.filter((s) => s.gradeLow === null && s.grades !== "");
  assert.deepEqual(unparsed.map((s) => s.grades), []);
});

test("reads grades people type", () => {
  assert.equal(parseGradeQuery("3rd"), 3);
  assert.equal(parseGradeQuery("9th grade"), 9);
  assert.equal(parseGradeQuery("Kindergarten"), KINDERGARTEN);
  assert.equal(parseGradeQuery("pre-k"), PREK);
  assert.equal(parseGradeQuery("infant"), INFANT);
  assert.equal(parseGradeQuery("13"), null);
});

test("filters by type, grade and zip together", () => {
  const { matches } = filterSchools(schools, { types: ["Public"], grade: "9", zip: "33127" });
  assert.ok(matches.length > 0);
  for (const s of matches) {
    assert.equal(s.type, "Public");
    assert.equal(s.zip, "33127");
    assert.ok(s.gradeLow! <= 9 && s.gradeHigh! >= 9);
  }
  assert.ok(matches.some((s) => s.name === "Miami Edison Senior High"));
});

test("near searches are sorted by distance and stay in the radius", () => {
  const { matches, center } = filterSchools(schools, { near: { zip: "33145" }, radiusMiles: 2 });
  assert.ok(center);
  assert.ok(matches.length > 0);
  for (let i = 1; i < matches.length; i++) assert.ok(matches[i - 1].distanceMiles! <= matches[i].distanceMiles!);
  assert.ok(matches.every((s) => s.distanceMiles! <= 2));
});

test("name search matches word starts, ignoring case and punctuation", () => {
  const { matches } = filterSchools(schools, { name: "coral way" });
  assert.ok(matches.some((s) => s.name === "Coral Way K-8 Center"));
});

test("search_schools returns a page and the total", () => {
  const out = runTool(schools, "search_schools", { types: ["Private"], city: "Coral Gables", limit: 3 });
  assert.equal(out.isError, false);
  const data = JSON.parse(out.content);
  assert.ok(data.total_matches >= 3);
  assert.equal(data.schools.length, 3);
  assert.ok(data.schools.every((s: { type: string }) => s.type === "Private"));
});

test("count_schools groups the matches", () => {
  const data = JSON.parse(runTool(schools, "count_schools", { group_by: "type" }).content);
  assert.equal(data.total, 1677);
  assert.equal(data.by_type.Private, 949);
});

test("bad tool input comes back as an error result, not an exception", () => {
  assert.equal(runTool(schools, "search_schools", { zip: "331" }).isError, true);
  assert.equal(runTool(schools, "search_schools", { grade: "freshman year of college" }).isError, true);
  assert.equal(runTool(schools, "search_schools", { near: { zip: "90210" } }).isError, true);
  assert.equal(runTool(schools, "search_schools", { unknown_field: 1 }).isError, true);
  assert.equal(runTool(schools, "no_such_tool", {}).isError, true);
});

test("tool schemas are plain JSON Schema objects", () => {
  for (const tool of toolDefinitions) {
    assert.equal(tool.input_schema.type, "object");
    assert.ok(!("$schema" in tool.input_schema));
  }
});

// A stand-in for the Anthropic client that returns scripted responses and records each request.
function fakeClient(responses: Partial<Anthropic.Beta.BetaMessage>[]) {
  const requests: Anthropic.Beta.MessageCreateParamsNonStreaming[] = [];
  const client = {
    beta: {
      messages: {
        create: async (params: Anthropic.Beta.MessageCreateParamsNonStreaming) => {
          // Copy the messages, since the session keeps appending to the same array.
          requests.push({ ...params, messages: [...params.messages] });
          const next = responses.shift();
          if (!next) throw new Error("no scripted response left");
          return { model: "claude-opus-5-5", ...next };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, requests };
}

test("runs a tool, returns the answer, and keeps history append-only", async () => {
  const { client, requests } = fakeClient([
    {
      stop_reason: "tool_use",
      content: [
        { type: "thinking", thinking: "", signature: "sig" } as Anthropic.Beta.BetaThinkingBlock,
        { type: "tool_use", id: "tu_1", name: "count_schools", input: { types: ["Charter"] } } as Anthropic.Beta.BetaToolUseBlock,
      ],
    },
    { stop_reason: "end_turn", content: [{ type: "text", text: "There are 180 charter campuses." } as Anthropic.Beta.BetaTextBlock] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "You're welcome!" } as Anthropic.Beta.BetaTextBlock] },
  ]);
  const session = new ChatSession(client);

  const first = await session.send("How many charter schools are there?");
  assert.equal(first.text, "There are 180 charter campuses.");
  assert.deepEqual(first.toolCalls, [{ name: "count_schools", input: { types: ["Charter"] } }]);

  // The second request carries the thinking block untouched and the tool result.
  const second = requests[1];
  assert.equal(second.messages.length, 3);
  const assistant = second.messages[1].content as Anthropic.Beta.BetaContentBlock[];
  assert.equal(second.messages[1].role, "assistant");
  assert.deepEqual(assistant[0], { type: "thinking", thinking: "", signature: "sig" });
  const toolResult = (second.messages[2].content as Anthropic.Beta.BetaToolResultBlockParam[])[0];
  assert.equal(toolResult.tool_use_id, "tu_1");
  assert.equal(JSON.parse(toolResult.content as string).total, 180);

  // Every request opts into server-side fallbacks.
  for (const r of requests) {
    assert.deepEqual(r.betas, ["server-side-fallback-2026-07-01"]);
    assert.equal(r.fallbacks, "default");
  }

  // The next turn builds on the earlier messages byte for byte.
  const before = JSON.stringify(session.messages);
  await session.send("Thanks!");
  const third = requests[2];
  assert.equal(JSON.stringify(third.messages.slice(0, 4)), before);
});

test("a refusal drops the turn so the chat can continue", async () => {
  const { client } = fakeClient([
    { stop_reason: "refusal", content: [] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Here are some schools." } as Anthropic.Beta.BetaTextBlock] },
  ]);
  const session = new ChatSession(client);
  const refused = await session.send("something off-topic");
  assert.equal(refused.stopReason, "refusal");
  assert.equal(session.messages.length, 0);
  const next = await session.send("Schools in Doral?");
  assert.equal(next.text, "Here are some schools.");
});

test("an API error leaves the history as it was", async () => {
  const { client } = fakeClient([]);
  const session = new ChatSession(client);
  await assert.rejects(session.send("hello"));
  assert.equal(session.messages.length, 0);
});
