import { SecretsManager } from "aws-sdk";
import { Type } from "aws-sdk/clients/appsync";
const getSecret = async <T>(secretArn: string): Promise<T | null> => {
  const secretsManagerClient = new SecretsManager();
  const secretsManagerResponse = await secretsManagerClient
    .getSecretValue({
      SecretId: secretArn,
    })
    .promise();

  const maybeSecretString: T | null = secretsManagerResponse.SecretString
    ? JSON.parse(secretsManagerResponse.SecretString)
    : null;

  return maybeSecretString;
};

export { getSecret };
