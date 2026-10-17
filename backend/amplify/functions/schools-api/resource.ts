import { defineFunction, secret } from '@aws-amplify/backend';

export const schoolsApi = defineFunction({
  name: 'schools-api',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 15,
  environment: {
    // Amplify console secrets. For a local sandbox run:
    // npx ampx sandbox secret set greatschools_api
    // npx ampx sandbox secret set googlemap
    GREATSCHOOLS_API_KEY: secret('greatschools_api'),
    GOOGLE_MAPS_API_KEY: secret('googlemap'),
  },
});
