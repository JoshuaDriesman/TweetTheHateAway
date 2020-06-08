import { Handler, APIGatewayEvent } from "aws-lambda";
import { createHmac } from "crypto";
import { SecretsManager } from "aws-sdk";
import {
  makeResponse,
  makeError,
  internalServerError,
} from "./common/responses";

const twitterCrcResponder: Handler = async (event: APIGatewayEvent) => {
  const secretsManagerClient = new SecretsManager({ apiVersion: "2017-10-17" });

  const maybeTwitterChallenge = event.queryStringParameters
    ? event.queryStringParameters["crc_token"]
    : null;

  const maybeTwitterSecretArn = process.env.TWITTER_SECRET_ARN;
  if (!maybeTwitterSecretArn) {
    console.error(
      "Twitter secret ARN environmental variable is not configured properly"
    );
    return internalServerError;
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
    console.error("Twitter consumer secret is missing");
    return internalServerError;
  }
  if (!maybeTwitterChallenge) {
    console.error("Twitter challenge is missing");
    return makeError("Challenge was not passed in as a query parameter.");
  }

  const hash = createHmac("sha256", maybeTwitterConsumerSecretKey)
    .update(maybeTwitterChallenge)
    .digest("base64");

  const response = {
    response_token: "sha256=" + hash,
  };

  return makeResponse(response);
};

export { twitterCrcResponder };
