import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';

/** Every error leaves the API as { statusCode, error, message, details? }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
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
    res.status(500).json({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Internal server error',
    });
  }
}
