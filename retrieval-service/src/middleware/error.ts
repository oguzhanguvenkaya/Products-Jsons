import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') as string | undefined;

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message || 'http_exception',
        status: err.status,
        request_id: requestId,
      },
      err.status,
    );
  }

  const message = err instanceof Error ? err.message : 'unknown_error';
  console.error(
    JSON.stringify({
      t: new Date().toISOString(),
      request_id: requestId,
      level: 'error',
      message,
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );

  return c.json(
    {
      error: 'internal_error',
      request_id: requestId,
    },
    500,
  );
};
