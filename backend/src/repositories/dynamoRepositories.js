// repositories/dynamoRepositories.js
// WHAT THIS FILE IS: the code that saves and loads accounts in DynamoDB.
// WHAT IT DOES: same functions as the memory version. Layout of the Users table (one table,
// partition key "pk"):
//   pk = "USER#<userId>"   -> the account itself
//   pk = "EMAIL#<email>"   -> a tiny lookup item { userId } so we can find an account by email,
//                             and so two accounts can never share an email (created together
//                             with the account in ONE transaction, which fails if it exists)
// NOTE FOR THE TEAMMATE: the final database design is yours. If you move to a different
// layout, only this file and src/scripts/setupTables.js need to change.

import { DeleteCommand, GetCommand, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { conflict } from "../utils/errors.js";

const userKey = (userId) => `USER#${userId}`;
const emailKey = (email) => `EMAIL#${email}`;
const strip = (item) => {
  if (!item) return null;
  const { pk, ...rest } = item;
  return rest;
};

export function createDynamoUserRepository(doc, tableName) {
  async function findById(userId) {
    const result = await doc.send(new GetCommand({ TableName: tableName, Key: { pk: userKey(userId) } }));
    return strip(result.Item);
  }

  return {
    findById,

    async create(user) {
      try {
        await doc.send(
          new TransactWriteCommand({
            TransactItems: [
              { Put: { TableName: tableName, Item: { pk: emailKey(user.email), userId: user.userId }, ConditionExpression: "attribute_not_exists(pk)" } },
              { Put: { TableName: tableName, Item: { pk: userKey(user.userId), ...user }, ConditionExpression: "attribute_not_exists(pk)" } },
            ],
          })
        );
      } catch (error) {
        if (error && error.name === "TransactionCanceledException") {
          throw conflict("An account with this email already exists.", { email: "An account with this email already exists." }, "EMAIL_TAKEN");
        }
        throw error;
      }
      return user;
    },

    async findByEmail(email) {
      const lookup = await doc.send(new GetCommand({ TableName: tableName, Key: { pk: emailKey(email) } }));
      return lookup.Item ? findById(lookup.Item.userId) : null;
    },

    // Changes only the fields given. Returns the updated account, or null if it does not exist.
    async update(userId, changes) {
      const names = {};
      const values = {};
      const parts = [];
      Object.entries(changes).forEach(([field, value], index) => {
        names[`#f${index}`] = field;
        values[`:v${index}`] = value;
        parts.push(`#f${index} = :v${index}`);
      });
      if (parts.length === 0) return findById(userId);
      try {
        const result = await doc.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: userKey(userId) },
            UpdateExpression: `SET ${parts.join(", ")}`,
            ConditionExpression: "attribute_exists(pk)",
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
            ReturnValues: "ALL_NEW",
          })
        );
        return strip(result.Attributes);
      } catch (error) {
        if (error && error.name === "ConditionalCheckFailedException") return null;
        throw error;
      }
    },

    // Used only to undo a half-finished sign-up.
    async remove(userId) {
      const user = await findById(userId);
      if (!user) return;
      await doc.send(
        new TransactWriteCommand({
          TransactItems: [
            { Delete: { TableName: tableName, Key: { pk: userKey(userId) } } },
            { Delete: { TableName: tableName, Key: { pk: emailKey(user.email) } } },
          ],
        })
      );
    },
  };
}

export function createDynamoResetTokenRepository(doc, tableName) {
  return {
    // expiresAtEpoch (seconds) is also the table's automatic-cleanup (TTL) field.
    async save(record) {
      const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
      await doc.send(new PutCommand({ TableName: tableName, Item: { ...record, expiresAtEpoch: Math.floor(new Date(record.expiresAt).getTime() / 1000) } }));
    },
    // Deletes the token and hands it back in one step, so it can only be used once.
    async consume(tokenHash) {
      const result = await doc.send(new DeleteCommand({ TableName: tableName, Key: { tokenHash }, ReturnValues: "ALL_OLD" }));
      return result.Attributes || null;
    },
  };
}
