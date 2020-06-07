import { Handler, Context, Callback, APIGatewayEvent } from "aws-lambda";
import { createHmac } from "crypto";
import { SecretsManager } from "aws-sdk";

const twitterCrcResponder: Handler = async (
  event: APIGatewayEvent,
  context: Context,
  callback: Callback
) => {
  const secretsManagerClient = new SecretsManager({ apiVersion: "2017-10-17" });

  const maybeTwitterChallenge = event.queryStringParameters
    ? event.queryStringParameters["crc_token"]
    : null;

  const maybeTwitterSecretArn = process.env.TWITTER_SECRET_ARN || "";
  const secretsManagerRequest = secretsManagerClient.getSecretValue({
    SecretId: maybeTwitterSecretArn,
  });
  const secretsManagerPromise = secretsManagerRequest.promise();
  const secretsManagerResponse = await secretsManagerPromise;

  const maybeTwitterConsumerSecretKey:
    | string
    | undefined
    | null = secretsManagerResponse.SecretString
    ? JSON.parse(secretsManagerResponse.SecretString)["ApiSecretKey"]
    : null;

  if (!maybeTwitterChallenge) {
    console.error("Twitter challenge is missing");
    callback("Request Failed", { statusCode: 500 });
  }
  if (!maybeTwitterConsumerSecretKey) {
    console.error("Twitter consumer secret is missing");
    callback("Request Failed", { statusCode: 500 });
  }

  const hash = createHmac("sha256", maybeTwitterConsumerSecretKey || "")
    .update(maybeTwitterChallenge || "")
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
