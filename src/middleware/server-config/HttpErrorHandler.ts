import { IErrorResponse } from "../../types";

export class HttpErrorHandler {
  public static create(status: number, message: string = ""): IErrorResponse {
    return {
      status,
      message,
    };
  }

  // 400 Bad Request
  public static BadRequest(message?: string): IErrorResponse {
    return HttpErrorHandler.create(400, message);
  }

  // 401 Unauthorized Request
  public static Unauthorized(message?: string): IErrorResponse {
    return HttpErrorHandler.create(401, message || "Access denied");
  }

  // 403 Forbidden Request
  public static Forbidden(message?: string): IErrorResponse {
    return HttpErrorHandler.create(403, message);
  }

  // 404 Not Found
  public static NotFound(message?: string): IErrorResponse {
    return HttpErrorHandler.create(404, message);
  }

  // 405 Method not allowed
  public static MethodNotAllowed(message?: string): IErrorResponse {
    return HttpErrorHandler.create(405, message);
  }

  // 406 Not Acceptable
  public static NotAcceptable(message?: string): IErrorResponse {
    return HttpErrorHandler.create(406, message);
  }

  // 409 Conflict
  public static Conflict(message?: string): IErrorResponse {
    return HttpErrorHandler.create(409, message);
  }

  // 423 Locked
  public static Locked(message?: string): IErrorResponse {
    return HttpErrorHandler.create(423, message);
  }

  // 424 Failed Dependency
  public static FailedDependency(message?: string): IErrorResponse {
    return HttpErrorHandler.create(424, message);
  }

  // 500 Internal Server Error
  public static InternalServerError(message?: string): IErrorResponse {
    return HttpErrorHandler.create(500, message);
  }

  // 503 Service unavailable
  public static ServiceUnavailable(message?: string): IErrorResponse {
    return HttpErrorHandler.create(503, message);
  }
}
