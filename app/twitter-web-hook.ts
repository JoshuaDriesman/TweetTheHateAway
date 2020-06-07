import { Handler, APIGatewayEvent } from "aws-lambda";
import { createHmac } from "crypto";
import { SecretsManager } from "aws-sdk";

const twitterCrcResponder: Handler = async (event: APIGatewayEvent) => {
  const secretsManagerClient = new SecretsManager({ apiVersion: "2017-10-17" });

  const maybeTwitterChallenge = event.queryStringParameters
    ? event.queryStringParameters["crc_token"]
    : null;

  const maybeTwitterSecretArn = process.env.TWITTER_SECRET_ARN || "";
  const secretsManagerResponse = await secretsManagerClient
    .getSecretValue({
      SecretId: maybeTwitterSecretArn,
    })
    .promise();

  const maybeTwitterConsumerSecretKey:
    | string
    | undefined
    | null = secretsManagerResponse.SecretString
    ? JSON.parse(secretsManagerResponse.SecretString)["ApiSecretKey"]
    : null;

  if (!maybeTwitterConsumerSecretKey) {
    console.error("Twitter consumer secret is missing");
    return {
      statusCode: 500,
      body: "Could not retrieve required resource, internal failure.",
    };
  }
  if (!maybeTwitterChallenge) {
    console.error("Twitter challenge is missing");
    return {
      statusCode: 400,
      body: "Challenge was not passed in as a query parameter.",
    };
  }

  const hash = createHmac("sha256", maybeTwitterConsumerSecretKey)
    .update(maybeTwitterChallenge)
    .digest("base64");

  const response = {
    response_token: "sha256=" + hash,
  };

  return {
    statusCode: 200,
    body: JSON.stringify(response),
    headers: { "Content-Type": "application/json" },
  };
};

export { twitterCrcResponder };
