// scripts/setupTables.js
// WHAT THIS FILE IS: a one-time helper that creates the DynamoDB tables this part needs.
// WHAT IT DOES: run "npm run setup-tables" once (DynamoDB Local must be running). It creates
// the Users table and the PasswordResets table (with automatic cleanup of expired tokens).
// It is safe to run again: tables that already exist are left alone.

import { CreateTableCommand, DescribeTableCommand, UpdateTimeToLiveCommand } from "@aws-sdk/client-dynamodb";
import { loadConfig } from "../config/env.js";
import { createDynamoClients } from "../db/dynamoClient.js";

const config = loadConfig();
const { raw } = createDynamoClients(config.aws);

async function exists(name) {
  try {
    await raw.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (error) {
    if (error.name === "ResourceNotFoundException") return false;
    throw error;
  }
}

async function ensure(name, keyName) {
  if (await exists(name)) return console.log(`Table ${name} already exists.`);
  await raw.send(
    new CreateTableCommand({
      TableName: name,
      AttributeDefinitions: [{ AttributeName: keyName, AttributeType: "S" }],
      KeySchema: [{ AttributeName: keyName, KeyType: "HASH" }],
      BillingMode: "PAY_PER_REQUEST",
    })
  );
  console.log(`Created table ${name}.`);
}

try {
  await ensure(config.aws.usersTable, "pk");
  await ensure(config.aws.resetTokensTable, "tokenHash");
  try {
    await raw.send(
      new UpdateTimeToLiveCommand({ TableName: config.aws.resetTokensTable, TimeToLiveSpecification: { Enabled: true, AttributeName: "expiresAtEpoch" } })
    );
  } catch (error) {
    console.log(`Note: could not switch on automatic cleanup (${error.name}). Expired tokens are still refused by the code.`);
  }
  console.log("Done.");
} catch (error) {
  console.error("Could not set up the tables. Is DynamoDB Local running at", config.aws.endpoint || "(AWS)", "?\n", error.message);
  process.exit(1);
}
