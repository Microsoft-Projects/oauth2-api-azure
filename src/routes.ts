// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import express = require("express");
import passport = require("passport");
import { Logger } from "./middleware/server-config/Logging";

export class AuthRouter {
    private baseApiUrl: string;
    private router = express.Router();

    constructor(baseApiUrl: string) {
        this.baseApiUrl = baseApiUrl;
    }

    public getRouter(): express.Router {
        return this.router;
    }

    public addAuthRoutes(): void {
        // Clients get redirected here in order to create an OAuth authorize url and redirect them to AAD.
        // There they will authenticate and give their consent to allow this app access to
        // some resource they own.
        this.router.get("/oauth/signin", (req, res, next) => {
            passport.authenticate("azuread-openidconnect", (error, user, info) => {
                if (error) {
                    return next(error);
                }
                if (!user) {
                    return res.redirect(`${this.baseApiUrl}/oauth/accessdenied`);
                }
            })(req, res, next);
        });

        // After consent is granted AAD redirects here.  The ADAL library is invoked via the
        // AuthenticationContext and retrieves an access token that can be used to access the
        // user owned resource.
        this.router.post(
            "/oauth/getAToken",
            passport.authenticate("azuread-openidconnect", {
                failureRedirect: `${this.baseApiUrl}/oauth/accessdenied`
            }),
            async (
                request: express.Request,
                response: express.Response,
                next: express.NextFunction
            ) => {
                if (!request.session) {
                    return response.send("Session Cookies are disabled.");
                }
                // redirect to the requested resource
                request.session.idToken = request.body.id_token;
                request.session.authCode = request.body.code;
                response.redirect(request.session.redirectUrl);
            }
        );

        this.router.get(
            "/oauth/signout",
            (request: express.Request, response: express.Response) => {
                Logger.trackTrace("Signing out");
                request.logout();
                if (request.session) {
                    request.session.accessToken = undefined;
                    request.session.authCode = undefined;
                    request.session.redirectUrl = undefined;
                    request.headers.authorization = undefined;
                }
                response.send("Successfully signed out.");
            }
        );

        this.router.get(
            "/oauth/refreshToken",
            (request: express.Request, response: express.Response) => {
                Logger.trackTrace("refreshing token.");
                if (request.session) {
                    request.session.authCode = request.session.refresh_token;
                    if (request.session.redirectUrl) {
                        response.redirect(request.session.redirectUrl);
                    } else {
                        response.status(401);
                        response.send("Can redirect to undefined url. Access denied.");
                    }
                } else {
                    response.status(500);
                    response.send("Session is not initialized");
                }
            }
        );

        this.router.get(
            "/oauth/accessdenied",
            (request: express.Request, response: express.Response, next: any) => {
                const err = new Error("Access denied");
                Logger.trackException(err);
                return next(err);
            }
        );
    }

}
