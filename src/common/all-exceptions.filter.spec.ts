import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function hostCapturing(json: jest.Mock): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status: jest.fn().mockReturnValue({ json }) }),
    }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('maps an HttpException to the error envelope', () => {
    const json = jest.fn();

    filter.catch(new NotFoundException('Nope'), hostCapturing(json));

    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      error: 'NotFound',
      message: 'Nope',
      code: 'NOT_FOUND',
    });
  });

  it('joins validation messages from a 400', () => {
    const json = jest.fn();

    filter.catch(
      new BadRequestException({
        message: ['a is required', 'b must be a string'],
      }),
      hostCapturing(json),
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'a is required; b must be a string',
      }),
    );
  });

  it('hides internal details of unexpected errors', () => {
    const json = jest.fn();

    filter.catch(
      new Error('SQLITE_ERROR: no such column: secret'),
      hostCapturing(json),
    );

    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  it('normalizes a body-parser "entity.too.large" error to 413', () => {
    const json = jest.fn();
    const bodyParserError = Object.assign(
      new Error('request entity too large'),
      {
        type: 'entity.too.large',
        status: 413,
      },
    );

    filter.catch(bodyParserError, hostCapturing(json));

    expect(json).toHaveBeenCalledWith({
      statusCode: 413,
      error: 'PayloadTooLarge',
      message: 'Request body is too large',
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('maps a Nest 413 to the envelope', () => {
    const json = jest.fn();

    filter.catch(new PayloadTooLargeException(), hostCapturing(json));

    expect(json).toHaveBeenCalledWith({
      statusCode: 413,
      error: 'PayloadTooLarge',
      message: expect.any(String),
      code: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('does not leak the exception message for unexpected errors', () => {
    const json = jest.fn();

    filter.catch(
      new Error('connect ECONNREFUSED 127.0.0.1:5432 /app/dist/secret.js'),
      hostCapturing(json),
    );

    const payload = json.mock.calls[0][0] as { message: string };
    expect(payload.message).toBe('Internal server error');
    expect(JSON.stringify(payload)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(payload)).not.toContain('secret.js');
  });
});
