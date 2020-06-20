import { Handler, SNSEvent } from "aws-lambda";

const tweetResponder: Handler = async (event: SNSEvent) => {
  console.log(event.Records[0].Sns);
  return "Success";
};

export { tweetResponder };
