import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Response } from 'express';

function bodyParserError(e: unknown) {
  const err = e as { type?: unknown; status?: unknown } | null;
  if (err?.type === 'entity.too.large') {
    return { statusCode: 413, error: 'PayloadTooLarge', message: 'Request body too large' };
  }
  if (err?.type === 'entity.parse.failed') {
    return { statusCode: 400, error: 'BadRequest', message: 'Malformed request body' };
  }
  return null;
}

/** Every error leaves the API as { statusCode, error, message, details? }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): unknown {
    // GraphQL has its own error format; hand the exception to Apollo (unexpected ones are logged).
    if (host.getType<string>() === 'graphql') {
      if (!(exception instanceof HttpException)) {
        Sentry.captureException(exception);
        this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      }
      return exception;
    }
    const res = host.switchToHttp().getResponse<Response>();

    // Body-parser (http-errors) failures arrive as plain errors with a status and a `type`.
    const parser = bodyParserError(exception);
    if (parser) {
      res.status(parser.statusCode).json(parser);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string' ? body : ((body as { message?: string | string[] }).message ?? '');
      if (status === 429) {
        // Retry-After is already set by the throttler guard.
        res.status(429).json({
          statusCode: 429,
          error: 'TooManyRequests',
          message: 'Too many requests',
        });
        return;
      }
      res.status(status).json({
        statusCode: status,
        error: exception.name.replace(/Exception$/, ''),
        ...(Array.isArray(message)
          ? { message: 'Validation failed', details: message }
          : { message }),
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    Sentry.captureException(exception); // no-op unless Sentry was initialised
    res.status(500).json({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Internal server error',
    });
  }
}
