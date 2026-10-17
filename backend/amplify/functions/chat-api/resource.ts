import { defineFunction, secret } from '@aws-amplify/backend';

export const chatApi = defineFunction({
  name: 'chat-api',
  entry: './handler.ts',
  runtime: 22,
  // A thinking model plus a few tool rounds can take a while; the Function URL has no 29s cap.
  timeoutSeconds: 120,
  memoryMB: 512,
  environment: {
    // Amplify console secret. For a local sandbox run: npx ampx sandbox secret set openrouter
    OPENROUTER_API_KEY: secret('openrouter'),
  },
});
