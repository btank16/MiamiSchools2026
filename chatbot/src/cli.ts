import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ChatSession, describeApiError, schools } from "./bot.ts";

// Chat with the bot in the terminal: npm run chat

const rl = readline.createInterface({ input, output });
const session = new ChatSession();
console.log(`Miami-Dade School Finder. ${schools().length} schools loaded. Type "exit" to quit.\n`);

while (true) {
  const question = (await rl.question("You: ")).trim();
  if (!question) continue;
  if (["exit", "quit"].includes(question.toLowerCase())) break;
  try {
    const reply = await session.send(question);
    for (const call of reply.toolCalls) console.log(`  [${call.name}] ${JSON.stringify(call.input)}`);
    console.log(`\nBot: ${reply.text}\n`);
  } catch (err) {
    console.error(`\nBot: ${describeApiError(err).message}\n`);
  }
}
rl.close();
