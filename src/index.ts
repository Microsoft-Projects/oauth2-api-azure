// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import passport from "passport";
import azureAd from "passport-azure-ad";
import { IAuthSettings } from "./types";

// max amount of state/nonce cookie you want to keep (cookie is deleted after validation so this can be very small)
export const NonceMaxAmount = 5;
// state/nonce cookie expiration in seconds
export const NonceLifetime = 600;

export async function authInit(
  authSettings: IAuthSettings,
  passToRBACCallback: any
): Promise<void> {
  const oidsOptions: azureAd.IOIDCStrategyOptionWithRequest = {
    identityMetadata: `https://login.microsoftonline.com/${
      authSettings.tenant
    }/.well-known/openid-configuration`,
    clientID: authSettings.clientId,
    responseType: "code id_token",
    responseMode: "form_post",
    redirectUrl: `${authSettings.redirectUri}/oauth/getAToken`,
    allowHttpForRedirectUrl: authSettings.allowHttpForRedirectUrl,
    clientSecret: authSettings.clientSecret,
    validateIssuer: authSettings.validateIssuer,
    isB2C: authSettings.isB2C,
    issuer: authSettings.issuer,
    passReqToCallback: true,
    scope: authSettings.scope,
    loggingLevel: authSettings.loggingLevel,
    loggingNoPII: authSettings.logginNoPII,
    nonceLifetime: NonceLifetime,
    nonceMaxAmount: NonceMaxAmount,
    useCookieInsteadOfSession: false,
  };

  // set up AD OAth v2 authentication
  const bearerStrategyOptions: azureAd.IBearerStrategyOptionWithRequest = {
    identityMetadata:
      "https://login.microsoftonline.com/" +
      authSettings.tenant +
      "/.well-known/openid-configuration",
    clientID: authSettings.clientId,
    audience: authSettings.apiAppId,
    validateIssuer: authSettings.validateIssuer,
    issuer: authSettings.tenant,
    loggingNoPII: authSettings.logginNoPII,
    passReqToCallback: true,
    loggingLevel: authSettings.loggingLevel,
  };

  const bearerStrategy = new azureAd.BearerStrategy(
    bearerStrategyOptions,
    (req, token, done) => {
      if (token) {
        // Validate user's permissions
        passToRBACCallback(
          token.oid, // ID uniquely identifying the user across applications.
          token.iss, // A security token service (STS) URI
          token.scp, // The set of scopes
          token.roles,
          req.session ? req.session.redirectUrl : null,
          (err, usr) => {
            if (err) {
              return done(err);
            }
            if (!usr) {
              // "No User found"
              return done(new Error("No valid user found"));
            }
            done(null, {}, token);
          }
        );
      }
    }
  );
  passport.use(bearerStrategy);

  const oidcStrategy = new azureAd.OIDCStrategy(
    oidsOptions,
    (
      request,
      iss,
      sub,
      user,
      jwtClaims,
      access_token,
      refresh_token,
      params,
      done
    ) => {
      if (!user.oid) {
        return done(new Error("No OID found"), null);
      }
      // Save authorization code and refresh tokens in the session cookies
      if (request.session) {
        // redirect to the requested resource
        request.session.idToken = request.body.id_token;
        request.session.authCode = request.body.code;
        request.session.access_token = access_token;
        request.session.refresh_token = refresh_token;
      }

      // Validate user's permissions
      passToRBACCallback(
        user,
        iss,
        jwtClaims,
        params,
        request.session ? request.session.redirectUrl : null,
        (err, usr) => {
          if (err) {
            return done(err);
          }
          if (!usr) {
            // "No User found"
            return done(new Error("No valid user found"));
          }
          if (request.session !== undefined && request.res !== undefined) {
            // redirect to the requested resource
            request.res.redirect(request.session.redirectUrl);
          } else {
            return done(err);
          }
        }
      );
    }
  );

  passport.use(oidcStrategy);
}
