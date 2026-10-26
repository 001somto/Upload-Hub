// scripts/setupTables.js
// Creates the DynamoDB tables needed by UploadHub.
// Safe to re-run: tables that already exist are left alone.

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
  if (await exists(name)) {
    console.log(`Table ${name} already exists.`);
    return;
  }
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
  console.log(`Connecting to AWS DynamoDB in region ${config.aws.region}...`);
  await ensure(config.aws.usersTable, "pk");
  await ensure(config.aws.resetTokensTable, "tokenHash");
  await ensure(config.aws.filesTable, "fileId");
  await ensure(config.aws.foldersTable, "folderId");
  await ensure(config.aws.departmentsTable, "departmentId");
  await ensure(config.aws.sharesTable, "linkId");
  await ensure(config.aws.notificationsTable, "notificationId");
  await ensure(config.aws.auditTable, "logId");

  try {
    await raw.send(
      new UpdateTimeToLiveCommand({
        TableName: config.aws.resetTokensTable,
        TimeToLiveSpecification: { Enabled: true, AttributeName: "expiresAtEpoch" },
      })
    );
  } catch (error) {
    console.log(`Note: could not switch on automatic cleanup (${error.name}).`);
  }

  console.log("All DynamoDB tables verified and ready!");
} catch (error) {
  console.error("Could not set up the tables on AWS:", error.message);
  process.exit(1);
}
