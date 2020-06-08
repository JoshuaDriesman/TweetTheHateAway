const DEFAULT_CONTENT_TYPE = "application/json";

const makeResponse = (
  body: Record<string, unknown>,
  statusCode?: number,
  headers?: Record<string, string>
): Record<string, unknown> => {
  statusCode = statusCode || 200;
  headers = headers || { "Content-Type": DEFAULT_CONTENT_TYPE };

  if (!("Content-Type" in headers))
    headers["Content-Type"] = DEFAULT_CONTENT_TYPE;

  const jsonBody = JSON.stringify(body);

  return {
    statusCode,
    body: jsonBody,
    headers,
  };
};

const makeError = (
  msg: string,
  statusCode?: number
): Record<string, unknown> => {
  statusCode = statusCode || 400;
  return makeResponse({ error: msg }, statusCode);
};

const internalServerError = makeError("Internal Server Error", 500);

export { makeResponse, makeError, internalServerError };
