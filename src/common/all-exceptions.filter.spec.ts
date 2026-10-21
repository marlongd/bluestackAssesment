import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
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
});
