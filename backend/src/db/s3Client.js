// db/s3Client.js
// Connection helper for AWS S3.

import { S3Client } from "@aws-sdk/client-s3";

export function createS3Client(s3Config = {}) {
  const options = {
    region: s3Config.region || "eu-west-1",
  };

  if (s3Config.endpoint) {
    options.endpoint = s3Config.endpoint;
    options.forcePathStyle = s3Config.forcePathStyle ?? true;
    options.credentials = { accessKeyId: "local", secretAccessKey: "local" };
  }

  return new S3Client(options);
}
