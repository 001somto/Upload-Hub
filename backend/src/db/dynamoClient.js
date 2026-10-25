// db/dynamoClient.js
// WHAT THIS FILE IS: the connection to DynamoDB.
// WHAT IT DOES: creates one client. With DYNAMODB_ENDPOINT set it talks to DynamoDB Local on
// your computer; without it, to real AWS (using the AWS credentials the teammate configures).

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function createDynamoClients(aws) {
  const options = { region: aws.region };
  if (aws.endpoint) {
    options.endpoint = aws.endpoint;
    // DynamoDB Local accepts any keys, but the SDK insists on having some.
    options.credentials = { accessKeyId: "local", secretAccessKey: "local" };
  }
  const raw = new DynamoDBClient(options);
  const doc = DynamoDBDocumentClient.from(raw, { marshallOptions: { removeUndefinedValues: true } });
  return { raw, doc };
}
