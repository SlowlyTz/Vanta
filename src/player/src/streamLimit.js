// The server refused a stream because the account's stream limit is reached.
export function isStreamLimitError(error) {
  return error?.code === 'STREAM_LIMIT_REACHED' || error?.status === 429;
}
