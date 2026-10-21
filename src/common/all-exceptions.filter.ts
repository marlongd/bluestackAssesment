import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

export interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code: string;
}

/** Stable, machine-readable error codes that clients can depend on. */
export const ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'PAYLOAD_TOO_LARGE',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_ERROR',
};

function messageFromException(exception: HttpException): string {
  const response = exception.getResponse();

  if (typeof response === 'string') {
    return response;
  }

  const message = (response as { message?: unknown }).message;
  if (Array.isArray(message)) {
    return message.join('; ');
  }
  if (typeof message === 'string') {
    return message;
  }

  return exception.message;
}

/**
 * Body-parser raises its own error (not a Nest HttpException) when a request
 * body exceeds the configured limit. Normalize it to a 413.
 */
function asPayloadTooLarge(exception: unknown): boolean {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    (exception as { type?: string }).type === 'entity.too.large'
  );
}

/**
 * Converts any thrown error into a single, predictable response shape and
 * makes sure internal details (stack traces, SQL text, file paths) never leak.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (asPayloadTooLarge(exception)) {
      const body: ErrorResponse = {
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        error: 'PayloadTooLarge',
        message: 'Request body is too large',
        code: 'PAYLOAD_TOO_LARGE',
      };
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body: ErrorResponse = {
        statusCode: status,
        error: exception.name.replace(/Exception$/, ''),
        message: messageFromException(exception),
        code: ERROR_CODES[status] ?? 'ERROR',
      };
      response.status(status).json(body);
      return;
    }

    // Anything unexpected is logged server-side and reported generically.
    this.logger.error(
      `Unhandled error: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const body: ErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
