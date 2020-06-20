import { Handler, APIGatewayEvent } from "aws-lambda";
import { createHmac, timingSafeEqual } from "crypto";
import { SecretsManager, SNS } from "aws-sdk";
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

  let hash: string;
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

const validateSecurityHeader = async (header: string, body: string) => {
  let bodyHash: string;
  try {
    bodyHash = await hashConsumerKeyWithContent(body);
  } catch (err) {
    console.error(err);
    return false;
  }

  let doesAuthHeaderMatchBodyHash: boolean;
  try {
    doesAuthHeaderMatchBodyHash = timingSafeEqual(
      Buffer.from(bodyHash),
      Buffer.from(header.replace("sha256=", ""))
    );
  } catch (err) {
    console.error(err);
    return false;
  }

  return doesAuthHeaderMatchBodyHash;
};

const twitterWebhookReceiver: Handler = async (event: APIGatewayEvent) => {
  const maybeTwitterAuthHeader = event.headers["X-Twitter-Webhooks-Signature"];

  if (!maybeTwitterAuthHeader) {
    console.log("Missing auth header");
    return makeError("No twitter auth header!");
  }

  if (!event.body) {
    console.log("Empty body");
    return makeError("Empty body!");
  }

  const isHeaderValid = await validateSecurityHeader(
    maybeTwitterAuthHeader,
    event.body
  );
  if (!isHeaderValid) {
    return makeError("Invalid authentication header!", 401);
  }

  const eventBody = JSON.parse(event.body);

  // Filter out any tweets which don't contain a mention of the TweetTheHateAway account
  const tweetTheHateAwayUserId = 1272247592332800000;
  const isTweetCreateEvent = eventBody.tweet_create_events !== undefined;
  const isMentioned =
    isTweetCreateEvent &&
    eventBody.tweet_create_events[0].entities.user_mentions
      .map((um: Record<string, unknown>) => um.id)
      .includes(tweetTheHateAwayUserId);
  const isRetweet =
    isTweetCreateEvent &&
    eventBody.tweet_create_events[0].retweeted_status !== undefined;

  if (!isMentioned || isRetweet) {
    console.log("Event is not what we want, filtering out");
    console.log({
      isTweetCreateEvent,
      isMentioned,
      isRetweet,
    });
    return makeResponse({ msg: "Got it!" });
  }

  const maybeSnsTopicArn = process.env.TWEET_SNS_TOPIC_ARN;
  if (!maybeSnsTopicArn) {
    console.error("No SNS topic ARN set!");
    return internalServerError;
  }

  const sns = new SNS();
  const snsParams = {
    Message: event.body,
    TopicArn: maybeSnsTopicArn,
  };
  try {
    await sns.publish(snsParams).promise();
  } catch (err) {
    console.error("SNS Publish Failed");
    console.error(err);
    return internalServerError;
  }

  return makeResponse({ msg: "Got it!" });
};

export { twitterCrcResponder, twitterWebhookReceiver };
