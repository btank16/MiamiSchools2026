import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import { Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { schoolsApi } from './functions/schools-api/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  schoolsApi,
});

// REST API in front of the schools-api Lambda, which proxies GreatSchools and Google Places.
const apiStack = backend.createStack('schools-api-stack');

const restApi = new RestApi(apiStack, 'SchoolsRestApi', {
  restApiName: 'miami-schools-api',
  deploy: true,
  deployOptions: {
    stageName: 'dev',
    // The API is public and both upstreams are metered, so cap request volume.
    throttlingRateLimit: 10,
    throttlingBurstLimit: 20,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS,
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: Cors.DEFAULT_HEADERS,
  },
});

// Every route is handled by the one Lambda, which does its own routing.
const integration = new LambdaIntegration(backend.schoolsApi.resources.lambda);
const schools = restApi.root.addResource('schools');
schools.addMethod('GET', integration);
schools.addResource('nearby').addMethod('GET', integration);
schools.addResource('{universalId}').addMethod('GET', integration);
restApi.root.addResource('usage').addMethod('GET', integration);
const places = restApi.root.addResource('places');
places.addResource('autocomplete').addMethod('GET', integration);
places.addResource('{placeId}').addMethod('GET', integration);

// Exposed to the frontend via amplify_outputs.json -> custom.API
backend.addOutput({
  custom: {
    API: {
      [restApi.restApiName]: {
        endpoint: restApi.url,
        region: Stack.of(restApi).region,
        apiName: restApi.restApiName,
      },
    },
  },
});
