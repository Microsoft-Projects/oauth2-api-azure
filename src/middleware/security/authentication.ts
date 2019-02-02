// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import express from "express";
import session from "express-session";
import passport from "passport";
import { AuthenticationContext, TokenResponse, ErrorResponse } from "adal-node";
import { validateAudience } from "./token-helpers";
import { AuthRouter } from "../../routes";
import { Logger } from "../../middleware/utilities/Logging";
import { HttpErrorHandler } from "../utilities/HttpErrorHandler";
import {
  IAuthSettings,
  IPassportOptions,
  SecurityStrategies,
} from "../../types";
import { Client } from "@microsoft/microsoft-graph-client";
import * as MicrosoftGraph from "@microsoft/microsoft-graph-types";

// MSGraph Resource
const graphResourceId = "https://graph.microsoft.com";
// the MSGraph API endpoint to get all groups in Azure AD
const groupsGraphUrl = "https://graph.microsoft.com/v1.0/groups";
// the MSGraph API endpoint to get all members of the particular group
const groupMemberGraphUrlTemplate =
  "https://graph.microsoft.com/v1.0/groups/{0}/members";

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
    baseAuthRoute: string
  ) {
    this.authRedirectUri = `${hostname}${baseAuthRoute}/oauth/getAToken`;
    this.signInUrl = `${hostname}${baseAuthRoute}/oauth/signin`;
    this.refreshTokenUrl = `${hostname}${baseAuthRoute}/oauth/refreshToken`;
    this.authSettings = authSettings;
    this.passportAuthOptions = passportOptions;
    this.baseAuthRoute = baseAuthRoute;
    this.app = null;
  }

  public setAppHandler(app: express.Express): express.Express {
    try {
      this.app = app;
      // Must use session for storing auth values
      this.app.use(
        session({
          secret: "api-oauth-azure",
          resave: false,
          saveUninitialized: true,
        })
      );

      if (this.baseAuthRoute === undefined || this.baseAuthRoute.length === 0) {
        throw new Error("Missing base API Uri");
      }

      // initialize OAuth routers
      const authRouter = new AuthRouter(this.baseAuthRoute);
      authRouter.addAuthRoutes();

      // add the OAuth router to the express app
      this.app.use(this.baseAuthRoute, authRouter.getRouter());

      return this.app;
    } catch (error) {
      Logger.trackException(error);
      throw error;
    }
  }

  public authenticate(securityStrategy: SecurityStrategies) {
    return async (request: any, response: any, next: any) => {
      if (!request.session) {
        // return to the error handler
        return next(
          HttpErrorHandler.Unauthorized("Session cookies must be enabled")
        );
      }

      switch (securityStrategy) {
        case SecurityStrategies.BEARER:
          // Check if the request contains the authorization header,
          // if it does, then go straight to the passport authentication
          // otherwise, check if the user has already been signed in by
          // checking the request session's accessToken
          if (!request.headers.authorization && request.session.accessToken) {
            request.headers.authorization =
              "Bearer " + request.session.accessToken;
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
                    return next(HttpErrorHandler.Unauthorized(authInfo));
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
                this.authSettings.apiAppId,
                request.session.authCode
              );
              return this.tokenResponseHandler(authInfo, request, response);
            } catch (error) {
              if (request.session) {
                if (
                  request.session.authCode !== request.session.refresh_token
                ) {
                  // Refresh Auth token and try again
                  return response.redirect(this.refreshTokenUrl);
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
                this.authSettings.apiAppId
              );
              return this.tokenResponseHandler(authInfo, request, response);
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
            const authCode =
              request.session.authCode ||
              (request.headers["x-auth-code"] as string);
            // If the user has already been signed in,
            // try to obtain the JWT token with the claims
            // that would allow accessing the API resource
            try {
              const authInfo = (await this.getAccessTokenSilently(
                this.authSettings.apiAppId,
                authCode
              )) as TokenResponse;
              if (
                validateAudience(
                  authInfo.accessToken,
                  this.authSettings.apiAppId
                )
              ) {
                // If the user has been successfully authenticated,
                // grant access to the requested API endpoint
                next();
              } else {
                return next(HttpErrorHandler.Unauthorized());
              }
            } catch (error) {
              if (error.error_codes.find(c => c === 54005)) {
                // the OAuth code has already been redeemed
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

  public async getAccessTokenSilently(
    resourceId: string,
    authCode?: string
  ): Promise<TokenResponse | ErrorResponse> {
    return new Promise<TokenResponse | ErrorResponse>(
      async (resolve, reject) => {
        try {
          const authorityUrl = `https://login.microsoftonline.com/${
            this.authSettings.tenant
          }`;
          const authContext = new AuthenticationContext(authorityUrl);

          if (authCode) {
            // Attempt to obtain the OAuth token using user's credentials
            await authContext.acquireTokenWithAuthorizationCode(
              authCode,
              this.authRedirectUri,
              resourceId,
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
              resourceId,
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
      }
    );
  }

  public async getAllADGroups(): Promise<MicrosoftGraph.Group[]> {
    try {
      // obtain the JWT token for accessing MS Graph API
      const authInfo = (await this.getAccessTokenSilently(
        graphResourceId
      )) as TokenResponse;

      const client = await this.getGraphClient(authInfo.accessToken);
      const graphResponse = await client.api(groupsGraphUrl).get();
      const groups = graphResponse.value as MicrosoftGraph.Group[];
      return groups;
    } catch (error) {
      Logger.trackException(error);
      return Promise.reject(error.message);
    }
  }

  public async findIfUserIsMemberOfGroup(
    groupId: string,
    userDisplayName: string
  ): Promise<boolean> {
    try {
      // obtain the JWT token for accessing MS Graph API
      const authInfo = (await this.getAccessTokenSilently(
        graphResourceId
      )) as TokenResponse;

      const client = await this.getGraphClient(authInfo.accessToken);
      const groupMemberGraphUrl = groupMemberGraphUrlTemplate.replace(
        "{0}",
        groupId
      );
      const graphRes = await client.api(groupMemberGraphUrl).get();
      const dirGroups = graphRes.value as MicrosoftGraph.Group[];
      if (dirGroups) {
        // iterate through the all groups
        dirGroups.forEach(group => {
          if (group.displayName === userDisplayName) {
            return Promise.resolve(true);
          }
        });
      }

      return Promise.resolve(false);
    } catch (error) {
      Logger.trackException(error);
      return Promise.reject(error.message);
    }
  }

  /////////////////////////////////////////////////////////////////////
  // Private Methods
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

  private async getGraphClient(accessToken: string): Promise<Client> {
    return Client.init({
      authProvider: done => {
        done(null, accessToken);
      },
    });
  }
}
