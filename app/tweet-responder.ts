import { Handler, SNSEvent } from "aws-lambda";
import Twit from "twit";

import { getSecret } from "./common/secret-manager";
import {
  TweetMessage,
  ApiCredentials,
  UserCredentials,
} from "./common/data-types";

const tweetResponder: Handler = async (event: SNSEvent) => {
  const maybeUserCredSecretArn = process.env.TWITTER_USER_SECRET_ARN;
  if (!maybeUserCredSecretArn) throw "User cred secret ARN is not set";

  const maybeTwitterApiSecretArn = process.env.TWITTER_API_SECRET_ARN;
  if (!maybeTwitterApiSecretArn) throw "API cred secret ARN is not set";

  const maybeUserCredSecret = await getSecret<UserCredentials>(
    maybeUserCredSecretArn
  );
  if (!maybeUserCredSecret) throw "Could not retrieve user cred secret";

  const maybeApiCreds = await getSecret<ApiCredentials>(
    maybeTwitterApiSecretArn
  );
  if (!maybeApiCreds) throw "Could not retrieve user cred secret";

  const t = new Twit({
    access_token: maybeUserCredSecret.AccessToken,
    access_token_secret: maybeUserCredSecret.AccessTokenSecret,
    consumer_key: maybeApiCreds.ApiKey,
    consumer_secret: maybeApiCreds.ApiSecretKey,
  });
  for (const record of event.Records) {
    const msg: TweetMessage = JSON.parse(record.Sns.Message);
    console.log(msg.statusId);
    await t.post("statuses/update", {
      status: `@${msg.user} Thanks for talking to me!`,
      in_reply_to_status_id: msg.statusId,
    });
  }

  return "Success";
};

export { tweetResponder };
