import { ThrottlerException } from '@nestjs/throttler';
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AllExceptionsFilter } from './http-exception.filter';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

const http = () => {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  return { res, host };
};

describe('AllExceptionsFilter and Sentry', () => {
  beforeEach(() => jest.clearAllMocks());
  const filter = new AllExceptionsFilter();
  jest.spyOn(filter['logger'], 'error').mockImplementation();

  it('reports unexpected errors and hides their details from the client', () => {
    const { res, host } = http();
    const boom = new Error('connection string postgres://secret');
    filter.catch(boom, host);
    expect(Sentry.captureException).toHaveBeenCalledWith(boom);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain('secret');
  });

  it("does not report expected HTTP errors (4xx are the client's problem, not an incident)", () => {
    const { res, host } = http();
    filter.catch(new BadRequestException('nope'), host);
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('reports unexpected errors in GraphQL too and returns them to Apollo', () => {
    const boom = new Error('db down');
    const host = { getType: () => 'graphql' } as unknown as ArgumentsHost;
    expect(filter.catch(boom, host)).toBe(boom);
    expect(Sentry.captureException).toHaveBeenCalledWith(boom);
  });

  it('answers 413 for oversized bodies without reporting them', () => {
    const { res, host } = http();
    filter.catch(
      Object.assign(new Error('too large'), { type: 'entity.too.large', status: 413 }),
      host,
    );
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 413,
      error: 'PayloadTooLarge',
      message: 'Request body too large',
    });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('answers 400 for malformed JSON without reporting it', () => {
    const { res, host } = http();
    filter.catch(Object.assign(new Error('bad json'), { type: 'entity.parse.failed' }), host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('normalises throttler errors', () => {
    const { res, host } = http();
    filter.catch(new ThrottlerException(), host);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 429,
      error: 'TooManyRequests',
      message: 'Too many requests',
    });
  });
});
