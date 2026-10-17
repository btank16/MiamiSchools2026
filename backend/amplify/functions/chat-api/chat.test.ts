// Run with: npm test (from backend/). No network or API key needed: the model client is faked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LambdaFunctionURLEvent } from 'aws-lambda';
import type { ChatRequest, ChatResult } from '@openrouter/sdk/models';
import { answer, MODELS, type SendChat } from './bot';
import { handleChat } from './handler';
import { filterSchools, INFANT, KINDERGARTEN, parseGrades, PREK, type School } from './schools';
import { runTool, toolDefinitions } from './tools';
import schoolsData from './schools.json';

const schools = schoolsData as School[];

function result(message: ChatResult['choices'][number]['message'], finishReason: string = 'stop'): ChatResult {
  return {
    id: 'gen-1', created: 0, model: MODELS[0], object: 'chat.completion', systemFingerprint: null,
    choices: [{ index: 0, finishReason: finishReason as never, message }],
  };
}

/** A stand-in for OpenRouter that replays scripted results and records each request. */
function fakeSender(results: ChatResult[]): { send: SendChat; requests: ChatRequest[] } {
  const requests: ChatRequest[] = [];
  const send: SendChat = async (request) => {
    requests.push(structuredClone(request));
    const next = results.shift();
    if (!next) throw new Error('no scripted result left');
    return next;
  };
  return { send, requests };
}

function event(body: unknown, method = 'POST'): LambdaFunctionURLEvent {
  return { requestContext: { http: { method } }, body: JSON.stringify(body), isBase64Encoded: false } as LambdaFunctionURLEvent;
}

test('schools.json holds every school from schools.csv', () => {
  assert.equal(schools.length, 1677);
  const count = (type: string) => schools.filter((s) => s.type === type).length;
  assert.equal(count('Public'), 358);
  assert.equal(count('Charter'), 180);
  assert.equal(count('Private'), 949);
  assert.equal(count('Head Start'), 86);
  assert.equal(count('Early Head Start'), 104);
  assert.deepEqual(schools.filter((s) => s.gradeLow === null && s.grades.trim() !== ''), []);
});

test('parses the grade formats in the data', () => {
  assert.deepEqual(parseGrades('PK-05'), { low: PREK, high: 5 });
  assert.deepEqual(parseGrades('Infant-PK'), { low: INFANT, high: PREK });
  assert.deepEqual(parseGrades('05-K'), { low: KINDERGARTEN, high: 5 });
  assert.deepEqual(parseGrades('18-PK'), { low: INFANT, high: PREK });
});

test('filters by type, grade and zip together', () => {
  const { matches } = filterSchools(schools, { types: ['Public'], grade: '9', zip: '33127' });
  assert.ok(matches.some((s) => s.name === 'Miami Edison Senior High'));
  assert.ok(matches.every((s) => s.type === 'Public' && s.zip === '33127'));
});

test('tools take the JSON string the model writes and report bad input as errors', () => {
  const ok = runTool(schools, 'count_schools', '{"group_by":"type"}');
  assert.equal(ok.isError, false);
  assert.equal(JSON.parse(ok.content).by_type.Private, 949);
  assert.equal(runTool(schools, 'search_schools', '{not json').isError, true);
  assert.equal(runTool(schools, 'search_schools', '{"zip":"331"}').isError, true);
  assert.equal(runTool(schools, 'no_such_tool', '{}').isError, true);
});

test('tool definitions are OpenRouter function tools with plain JSON Schema', () => {
  for (const tool of toolDefinitions) {
    assert.ok('function' in tool && tool.type === 'function');
    assert.equal(tool.function.parameters?.type, 'object');
    assert.ok(!('$schema' in (tool.function.parameters ?? {})));
  }
});

test('runs a tool round, passes reasoning back, and returns the answer', async () => {
  const { send, requests } = fakeSender([
    result({
      role: 'assistant',
      content: null,
      reasoningDetails: [{ type: 'reasoning.text', text: 'Count charters.' } as never],
      toolCalls: [{ id: 'call_1', type: 'function', function: { name: 'count_schools', arguments: '{"types":["Charter"]}' } }],
    }, 'tool_calls'),
    result({ role: 'assistant', content: 'There are 180 charter campuses.' }),
  ]);

  const reply = await answer([{ role: 'user', content: 'How many charter schools?' }], schools, send);
  assert.equal(reply.reply, 'There are 180 charter campuses.');
  assert.deepEqual(reply.toolCalls, [{ name: 'count_schools', input: { types: ['Charter'] } }]);

  assert.deepEqual(requests[0].models, ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free']);
  assert.deepEqual(reply.models, [MODELS[0]]);
  assert.equal(requests[0].messages[0].role, 'system');
  const second = requests[1].messages;
  const assistant = second[2] as { role: string; toolCalls?: unknown[]; reasoningDetails?: unknown[] };
  assert.equal(assistant.role, 'assistant');
  assert.equal(assistant.toolCalls?.length, 1);
  assert.equal(assistant.reasoningDetails?.length, 1);
  const tool = second[3] as { role: string; toolCallId: string; content: string };
  assert.equal(tool.role, 'tool');
  assert.equal(tool.toolCallId, 'call_1');
  assert.equal(JSON.parse(tool.content).total, 180);
});

test('stops after too many tool rounds', async () => {
  const loop = () => result({
    role: 'assistant',
    content: null,
    toolCalls: [{ id: 'c', type: 'function', function: { name: 'count_schools', arguments: '{}' } }],
  }, 'tool_calls');
  const { send } = fakeSender(Array.from({ length: 10 }, loop));
  const reply = await answer([{ role: 'user', content: 'hi' }], schools, send);
  assert.equal(reply.finishReason, 'tool_rounds_exceeded');
});

test('the handler validates the conversation', async () => {
  const neverCalled = () => { throw new Error('should not reach the model'); };
  assert.equal((await handleChat(event({}), neverCalled)).statusCode, 400);
  assert.equal((await handleChat(event({ messages: [{ role: 'system', content: 'x' }] }), neverCalled)).statusCode, 400);
  assert.equal((await handleChat(event({ messages: [{ role: 'user', content: 'x'.repeat(2001) }] }), neverCalled)).statusCode, 400);
  assert.equal((await handleChat(event({ messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] }), neverCalled)).statusCode, 400);
  assert.equal((await handleChat(event({}, 'GET'), neverCalled)).statusCode, 405);
});

test('the handler says when the OpenRouter key is missing', async () => {
  const res = await handleChat(event({ messages: [{ role: 'user', content: 'hi' }] }), () => null);
  assert.equal(res.statusCode, 500);
  assert.match(String(res.body), /OpenRouter key/);
});

test('the handler returns the reply and tool calls', async () => {
  const { send } = fakeSender([result({ role: 'assistant', content: 'Hello!' })]);
  const res = await handleChat(event({ messages: [{ role: 'user', content: 'hi' }] }), () => send);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(String(res.body)), { reply: 'Hello!', toolCalls: [] });
});
