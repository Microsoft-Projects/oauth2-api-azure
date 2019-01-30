export interface IAuthSettings {
    tenant: string;
    clientId: string;
    clientSecret: string;
    apiAppId: string;
    redirectUri: string;
    validateIssuer: boolean;
    isB2C: boolean;
    issuer: string;
    scope: string;
    allowHttpForRedirectUrl: boolean;
    loggingLevel: string;
    logginNoPII: boolean;
    useCookieInsteadOfSession: boolean;
}

export interface IErrorResponse {
    status: number;
    message: string;
}

export interface IPassportOptions {
    session: boolean;
    passReqToCallback: boolean;
    authInfo: boolean;
    failureMessage: boolean;
    failWithError: boolean;
    successMessage: boolean;
}

export enum SecurityStrategies {
    BEARER = "oauth-bearer",
    AUTH_CODE = "user-auth"
}
