import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Response } from 'express';

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

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string' ? body : ((body as { message?: string | string[] }).message ?? '');
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
