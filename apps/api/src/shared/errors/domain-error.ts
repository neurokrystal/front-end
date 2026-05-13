export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, identifier: string) {
    super(
      `${resource} not found with identifier: ${identifier}`,
      'NOT_FOUND',
      404,
      { resource, identifier }
    );
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class AccessDeniedError extends DomainError {
  constructor(viewerId: string, subjectId: string, reason: string) {
    super(
      reason,
      'ACCESS_DENIED',
      404, // 404 per brief anti-enumeration requirement
      { viewerId, subjectId, reason }
    );
  }
}

export class InsufficientDataError extends DomainError {
  constructor(threshold: number, actual: number) {
    super(
      'Insufficient data to render — below anonymisation threshold',
      'INSUFFICIENT_DATA',
      200, // Not an error status — intentional suppression per brief
      { threshold, actual }
    );
  }
}
