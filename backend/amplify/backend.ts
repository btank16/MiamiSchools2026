import { defineBackend } from '@aws-amplify/backend';
import { Duration, Stack } from 'aws-cdk-lib';
import { Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { schoolsApi } from './functions/schools-api/resource';
import { chatApi } from './functions/chat-api/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  schoolsApi,
  chatApi,
});

// REST API in front of the schools-api Lambda, which proxies GreatSchools, Google Places and Miami-Dade County GIS.
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
restApi.root.addResource('address').addResource('report').addMethod('GET', integration);

// The chatbot gets a Function URL instead of a REST API route: API Gateway caps requests at 29s,
// and a thinking model with a few tool rounds can take longer.
const chatUrl = backend.chatApi.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [HttpMethod.POST],
    allowedHeaders: ['content-type'],
    maxAge: Duration.minutes(10),
  },
});

// Exposed to the frontend via amplify_outputs.json -> custom.API and custom.chat
backend.addOutput({
  custom: {
    API: {
      [restApi.restApiName]: {
        endpoint: restApi.url,
        region: Stack.of(restApi).region,
        apiName: restApi.restApiName,
      },
    },
    chat: {
      endpoint: chatUrl.url,
      model: 'thinkingmachines/inkling:free',
    },
  },
});
