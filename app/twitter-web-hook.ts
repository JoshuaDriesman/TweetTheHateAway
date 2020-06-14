import { Handler, APIGatewayEvent } from "aws-lambda";
import { createHmac } from "crypto";
import { SecretsManager } from "aws-sdk";
import {
  makeResponse,
  makeError,
  internalServerError,
} from "./common/responses";

const hashConsumerKeyWithContent = async (content: string) => {
  const secretsManagerClient = new SecretsManager({ apiVersion: "2017-10-17" });

  const maybeTwitterSecretArn = process.env.TWITTER_SECRET_ARN;
  if (!maybeTwitterSecretArn) {
    const msg =
      "Twitter secret ARN environmental variable is not configured properly";
    console.error(msg);
    throw msg;
  }

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
    const msg = "Twitter consumer secret is missing";
    console.error(msg);
    throw msg;
  }

  const hash = createHmac("sha256", maybeTwitterConsumerSecretKey)
    .update(content)
    .digest("base64");

  return hash;
};

const twitterCrcResponder: Handler = async (event: APIGatewayEvent) => {
  const maybeTwitterChallenge = event.queryStringParameters
    ? event.queryStringParameters["crc_token"]
    : null;

  if (!maybeTwitterChallenge) {
    console.error("Twitter challenge is missing");
    return makeError("Challenge was not passed in as a query parameter.");
  }

  let hash;
  try {
    hash = await hashConsumerKeyWithContent(maybeTwitterChallenge);
  } catch (err) {
    return internalServerError;
  }

  const response = {
    response_token: "sha256=" + hash,
  };

  return makeResponse(response);
};

const twitterWebhookReceiver: Handler = async (event: APIGatewayEvent) => {
  console.log(event.headers);
  console.log(event.body);
  return makeResponse({ msg: "Got it!" });
};

export { twitterCrcResponder, twitterWebhookReceiver };
