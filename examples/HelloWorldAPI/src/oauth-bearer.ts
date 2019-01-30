import express = require("express");
import session from "express-session";
import * as oauth from "../../../lib/index";
import * as authentication from "../../../lib/middleware/security/authentication";
import { IAuthSettings, SecurityStrategies } from "../../../lib/types";

let app = express();
app.use(express.json());
app.use(express.urlencoded());

const port = 3000; // default port to listen
const baseApiUrl = `/api`;

const authSettings: IAuthSettings = {
    tenant: "d197a05e-5952-4466-88ca-1bc6d05eee59",
    clientId: "3d95c545-6c63-4c95-9ae0-7ecc61774fd3",
    clientSecret: "#])?%DuL_}6[T^E/};/}a{n-&**K%-s24_ra*]A8lxkc#}-)Gn(}M;PCD1./{${",
    apiAppId: "0472a99e-fc93-4804-be57-e7b99ed6c057",
    redirectUri: `http://localhost:${port}${baseApiUrl}/oauth/getAToken`,
    validateIssuer: false,
    isB2C: false,
    issuer: "",
    scope: "offline_access",
    allowHttpForRedirectUrl: true,
    loggingLevel: "error",
    logginNoPII: false,
    useCookieInsteadOfSession: false
};

const passportAuthOptions = {
    session: false,
    passReqToCallback: true,
    authInfo: true,
    failureMessage: true,
    failWithError: true,
    successMessage: false
};

// Must use session for storing auth values
// app.use(cookieParser());
app.use(
    session({
        secret: "HelloOAuth2",
        resave: false,
        saveUninitialized: true
    })
);

// initialize OAuth passport strategy
oauth.authInit(authSettings, validateUserRoleCallback);

// initialize OAuth middleware
const authMiddleware = new authentication.OAuthMiddleware(
    authSettings,
    passportAuthOptions,
    `http://localhost:${port}`,
    baseApiUrl);

// Couple the app to the Auth routes
app = authMiddleware.setAppHandler(app);

// define a route handler for the default home page
app.get("/", (req, res) => {
    res.send(`API Home Page. Try to call API endpoint with your name: http://localhost:${port}/api/hello/<your name>`);
});

app.get(
    `${baseApiUrl}/hello/:name`,
    authMiddleware.authenticate(SecurityStrategies.BEARER),
    (request, response) => {
    const name = request.params.name;

    if (!isNaN(name)) {
        response
            .status(400)
            .send("No string as name");
    } else {
        request.session.userName = name;
        response.json({
            "message": "Hello, " + name
        });
    }
});

// Error handler
app.use((err: any, req, res, next) => {
    // if unauthorized
    if (err.status === 401) {
        // destroy session's JWT token
        req.session.idToken = undefined;
        req.session.accessToken = undefined;
    }

    // Send the error message to the user
    res
        .status(err.status)
        .send(err.message);
});

app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
});

async function validateUserRoleCallback(
    userId,
    issuer,
    scopes,
    params,
    requestedResource,
    passToAuthCallback): Promise<any> {
    const isAuthorized = true;

    if (isAuthorized && userId) {
        passToAuthCallback(null, userId);
    } else {
        passToAuthCallback(new Error("Unauthorized"), userId);
    }
    return Promise.resolve(isAuthorized);
}