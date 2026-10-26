// services/snsService.js
// Sends email notifications for user activity using Amazon Simple Notification Service (SNS).

import { SNSClient, SubscribeCommand, PublishCommand } from "@aws-sdk/client-sns";

export function createSnsService({ config = {} }) {
  const topicArn = config?.aws?.snsTopicArn || process.env.SNS_TOPIC_ARN || "";
  const region = config?.aws?.region || process.env.AWS_REGION || "eu-west-1";
  const isEnabled = Boolean(topicArn && topicArn.startsWith("arn:aws:sns:"));

  let client = null;
  if (isEnabled) {
    client = new SNSClient({ region });
  }

  return {
    isEnabled() {
      return Boolean(client && topicArn);
    },

    getTopicArn() {
      return topicArn;
    },

    /**
     * Subscribes a user's email to the SNS Topic with a FilterPolicy on their userId.
     * This guarantees the user only receives notifications addressed to their userId.
     */
    async subscribeUser({ userId, email }) {
      if (!client || !topicArn || !email || !userId) return null;
      try {
        const result = await client.send(
          new SubscribeCommand({
            TopicArn: topicArn,
            Protocol: "email",
            Endpoint: email.trim().toLowerCase(),
            Attributes: {
              FilterPolicy: JSON.stringify({
                userId: [userId],
              }),
            },
            ReturnSubscriptionArn: true,
          })
        );
        return {
          subscriptionArn: result.SubscriptionArn,
          isPending:
            result.SubscriptionArn === "pending confirmation" ||
            result.SubscriptionArn === "PendingConfirmation",
        };
      } catch (error) {
        console.warn(`[SNS Subscribe notice for ${email}]:`, error.message);
        return null;
      }
    },

    /**
     * Publishes an activity notification to the SNS topic for a specific user.
     */
    async publishNotification({ userId, type = "info", message, subject }) {
      if (!client || !topicArn || !userId || !message) return null;

      try {
        const emailSubject = subject || `UploadHub: ${formatType(type)}`;
        const emailBody = [
          `UploadHub Activity Notification`,
          `================================`,
          ``,
          message,
          ``,
          `Activity Type: ${type}`,
          `Date: ${new Date().toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} (WAT)`,
          ``,
          `Open your UploadHub workspace:`,
          config.frontendUrl || process.env.FRONTEND_URL || "http://localhost:5173",
          ``,
          `================================`,
          `You received this email because activity notifications are enabled for your UploadHub account.`,
        ].join("\n");

        const result = await client.send(
          new PublishCommand({
            TopicArn: topicArn,
            Subject: emailSubject.slice(0, 100),
            Message: emailBody,
            MessageAttributes: {
              userId: {
                DataType: "String",
                StringValue: userId,
              },
              type: {
                DataType: "String",
                StringValue: type,
              },
            },
          })
        );
        return result;
      } catch (error) {
        console.warn(`[SNS Publish notice for ${userId}]:`, error.message);
        return null;
      }
    },
  };
}

function formatType(type) {
  switch (type) {
    case "file":
      return "File Activity";
    case "share":
      return "Share Link Update";
    case "membership":
      return "Department Membership Update";
    case "account":
      return "Account Settings Changed";
    case "security":
      return "Security Alert";
    default:
      return "Activity Notification";
  }
}
