interface TweetMessage {
  tweetBody: string;
  userId: string;
  user: string;
  statusId: string;
}

interface ApiCredentials {
  AccessToken: string;
  AccessTokenSecret: string;
  ApiKey: string;
  ApiSecretKey: string;
}

interface UserCredentials {
  AccessToken: string;
  AccessTokenSecret: string;
  UserId: string;
  ScreenName: string;
}

export { TweetMessage, ApiCredentials, UserCredentials };
