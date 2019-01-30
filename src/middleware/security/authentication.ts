import express = require("express");
import session from "express-session";
import passport = require("passport");
import { AuthenticationContext, TokenResponse, ErrorResponse } from "adal-node";
import { validateAudience } from "./token-helpers";
import { AuthRouter } from "../../routes";
import { Logger } from "../../middleware/server-config/Logging";
import { HttpErrorHandler } from "../server-config/HttpErrorHandler";
import { IAuthSettings, IPassportOptions, SecurityStrategies } from "../../types";

export class OAuthMiddleware {
    private app: express.Express;
    private authRedirectUri: string;
    private signInUrl: string;
    private refreshTokenUrl: string;
    private authSettings: IAuthSettings;
    private passportAuthOptions: IPassportOptions;
    private baseAuthRoute: string;

    constructor(
        authSettings: IAuthSettings,
        passportOptions: IPassportOptions,
        hostname: string,
        baseAuthRoute: string) {
        this.authRedirectUri = `${hostname}${baseAuthRoute}/oauth/getAToken`;
        this.signInUrl = `${hostname}${baseAuthRoute}/oauth/signin`;
        this.refreshTokenUrl = `${hostname}${baseAuthRoute}/oauth/refreshToken`;
        this.authSettings = authSettings;
        this.passportAuthOptions = passportOptions;
        this.baseAuthRoute = baseAuthRoute;
        this.app = null;
    }

    public setAppHandler(app: express.Express): express.Express {
        this.app = app;
        // Must use session for storing auth values
        this.app.use(
            session({
                secret: "api-oauth-azure",
                resave: false,
                saveUninitialized: true
            })
        );

        // initialize OAuth routers
        const authRouter = new AuthRouter(this.baseAuthRoute);
        authRouter.addAuthRoutes();

        // add the OAuth router to the express app
        this.app.use(this.baseAuthRoute, authRouter.getRouter());

        return this.app;
    }

    public authenticate(securityStrategy: SecurityStrategies) {
        return async (
            request: any,
            response: any,
            next: any
        ) => {
            if (!request.session) {
                // return to the error handler
                return next(
                    HttpErrorHandler.Unauthorized(
                        "Session cookies must be enabled"
                    )
                );
            }

            switch (securityStrategy) {
                case SecurityStrategies.BEARER:
                    // Check if the request contains the authorization header,
                    // if it does, then go straight to the passport authentication
                    // otherwise, check if the user has already been signed in by
                    // checking the request session's accessToken
                    if (!request.headers.authorization && request.session.accessToken) {
                        request.headers.authorization = "Bearer " + request.session.accessToken;
                    }

                    if (request.headers.authorization) {
                        try {
                            await passport.authenticate(
                                securityStrategy,
                                this.passportAuthOptions,
                                (req, err, authInfo) => {
                                    if (authInfo && authInfo.oid !== undefined) {
                                        next();
                                    } else {
                                        // return to the error handler
                                        return next(
                                            HttpErrorHandler.Unauthorized(authInfo)
                                        );
                                    }
                                }
                            )(request);
                        } catch (error) {
                            response.status(401);
                            next(error);
                        }
                    } else if (request.session.authCode) {
                            // If the user has already been signed in,
                            // try to obtain the JWT token with the claims
                            // that would allow accessing the Data API resource
                            try {
                                const authInfo = await this.getAccessTokenSilently(
                                    request,
                                    request.session.authCode
                                );
                                return this.tokenResponseHandler(
                                    authInfo,
                                    request,
                                    response
                                );
                            } catch (error) {
                                if (request.session) {
                                    if (
                                        request.session.authCode !==
                                        request.session.refresh_token
                                    ) {
                                        // Refresh Auth token and try again
                                        return response.redirect(
                                            this.refreshTokenUrl
                                        );
                                    } else {
                                        return next(HttpErrorHandler.Unauthorized());
                                    }
                                }
                            }
                    } else if (request.session.useClientCredentials) {
                            // If the user has already been signed in,
                            // try to obtain the JWT token with the claims
                            // that would allow accessing the Data API resource
                            try {
                                const authInfo = await this.getAccessTokenSilently(
                                    request
                                );
                                return this.tokenResponseHandler(
                                    authInfo,
                                    request,
                                    response
                                );
                            } catch (error) {
                                // Refresh Auth token and try again
                                return response.redirect(this.signInUrl);
                            }
                    } else {
                        // Redirect user/app to the sign-in page
                        return response.redirect(this.signInUrl);
                    }

                    break;

                case SecurityStrategies.AUTH_CODE:
                    // If user's auth code is provided in the header,
                    // then verify the token and continue to the next middleware
                    if (request.headers["x-auth-code"] || request.session.authCode) {
                        const authCode = request.session.authCode || request.headers["x-auth-code"] as string;
                        // If the user has already been signed in,
                        // try to obtain the JWT token with the claims
                        // that would allow accessing the API resource
                        try {
                            const authInfo = (await this.getAccessTokenSilently(
                                request,
                                authCode
                            )) as TokenResponse;
                            if (validateAudience(authInfo.accessToken, this.authSettings.apiAppId)) {
                                // If the user has been successfully authenticated,
                                // grant access to the requested API endpoint
                                next();
                            } else {
                                return next(HttpErrorHandler.Unauthorized());
                            }
                        } catch (error) {
                            if (error.error_codes.find(c => c === 54005)) { // the OAuth code has already been redeemed
                                // grant access to the requested API endpoint
                                next();
                            } else {
                                return next(HttpErrorHandler.Unauthorized(error.message));
                            }
                        }
                    } else {
                        // If user hasn't been authenticated yet,
                        // redirect to the sign-in flow
                        request.session.redirectUrl = request.originalUrl;
                        // Redirect to the sign-in api
                        return response.redirect(this.signInUrl);
                    }

                    break;

                default:
                    return next(HttpErrorHandler.Unauthorized());
            }
        };
    }

    /////////////////////////////////////////////////////////////////////
    // Private Methods
    private async getAccessTokenSilently(
        request: any,
        authCode?: string
    ): Promise<TokenResponse | ErrorResponse> {
        return new Promise<TokenResponse | ErrorResponse>(async (resolve, reject) => {

            try {
                const authorityUrl = `https://login.microsoftonline.com/${this.authSettings.tenant}`;
                const authContext = new AuthenticationContext(authorityUrl);

                if (authCode) {
                    // Attempt to obtain the OAuth token using user's credentials
                    await authContext.acquireTokenWithAuthorizationCode(
                        authCode,
                        this.authRedirectUri,
                        this.authSettings.apiAppId,
                        this.authSettings.clientId,
                        this.authSettings.clientSecret,
                        (err, res) => {
                            if (err) {
                                Logger.trackException(err);
                                reject(res);
                            }
                            resolve(res);
                        }
                    );
                } else {
                    // If authCode is not provided, attempt to obtain the OAuth token using client credentials
                    await authContext.acquireTokenWithClientCredentials(
                        this.authSettings.apiAppId,
                        this.authSettings.clientId,
                        this.authSettings.clientSecret,
                        (err, res) => {
                            if (err) {
                                Logger.trackException(err);
                                reject(err);
                            }
                            resolve(res);
                        }
                    );
                }
            } catch (error) {
                Logger.trackException(error);
                reject(error);
            }
        });
    }

    private tokenResponseHandler(res, request, response) {
        const authInfo: TokenResponse = res as TokenResponse;

        if (request.query.authInfo) {
            response.send(
                `UserId:${authInfo.userId}\nObjectId:${authInfo.oid}\nAccessToken=${
                    authInfo.accessToken
                }`
            );
        } else if (request.session) {
            // Add the access token to the response cookie and
            // then perform the call to the original API endpoint
            request.session.accessToken = authInfo.accessToken;
            request.session.redirectUrl = request.originalUrl;
            return response.redirect(request.session.redirectUrl);
        } else {
            response.send(authInfo.accessToken);
        }
    }

}
