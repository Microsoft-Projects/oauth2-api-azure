"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const dotenv_1 = __importDefault(require("dotenv"));
const envalid_1 = __importDefault(require("envalid"));
const oauth2 = __importStar(require("oauth2-api-azure"));
const oauth2_api_azure_1 = require("oauth2-api-azure");
dotenv_1.default.config();
const env = envalid_1.default.cleanEnv(process.env, {
    TENANT_ID: envalid_1.default.str({
        example: "d197a05e-...",
        desc: "Azure AD tenant name or ID. e.g. contoso.onmicrosoft.com",
    }),
    CLIENT_ID: envalid_1.default.str({
        example: "d197a05e-...",
        desc: "The APP ID of the client app that was registered and configured to have access to the Azure resource",
    }),
    CLIENT_SECRET: envalid_1.default.str({
        example: "d197a05e-...",
        desc: "The Client Secret of the Client App above",
    }),
    RESOURCE_ID: envalid_1.default.str({
        example: "d197a05e-...",
        desc: "The unique APP ID of the Azure Web API to obtain access to",
    }),
    RBAC_GROUP: envalid_1.default.str({
        example: "API Group",
        desc: "The name of the group of users for whom access to this API is granted",
    }),
    PORT: envalid_1.default.port({
        example: "3000",
        default: 3000,
        desc: "The localhost port on which this sample would run",
    }),
});
let app = express_1.default();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded());
const hostname = "http://localhost";
const port = env.PORT; // default port to listen
const baseApiUrl = "/api"; // the based relative uri for this Web API
const authSettings = {
    tenant: env.TENANT_ID,
    clientId: env.CLIENT_ID,
    clientSecret: env.CLIENT_SECRET,
    apiAppId: env.RESOURCE_ID,
    redirectUri: `${hostname}:${port}${baseApiUrl}`,
    validateIssuer: false,
    isB2C: false,
    issuer: "",
    scope: "offline_access",
    allowHttpForRedirectUrl: true,
    loggingLevel: "error",
    logginNoPII: false,
    useCookieInsteadOfSession: false,
};
const passportAuthOptions = {
    session: false,
    passReqToCallback: true,
    authInfo: true,
    failureMessage: true,
    failWithError: true,
    successMessage: false,
};
// Must use session for storing auth values
// app.use(cookieParser());
app.use(express_session_1.default({
    secret: "HelloOAuth2",
    resave: false,
    saveUninitialized: true,
}));
// initialize OAuth passport strategy
oauth2.authInit(authSettings, validateUserRoleCallback);
// initialize OAuth middleware
const authMiddleware = new oauth2.OAuthMiddleware(authSettings, passportAuthOptions, `${hostname}:${port}`, baseApiUrl);
// Couple the app to the Auth routes
app = authMiddleware.setAppHandler(app);
// define a route handler for the default home page
app.get("/", (req, res) => {
    res.send(`API Home Page. Try to call API endpoint with your name: ${hostname}:${port}/api/hello/<your name>`);
});
app.get(`${baseApiUrl}/hello/:name`, 
// here goes the Azure OAuth2 Middleware
authMiddleware.authenticate(oauth2_api_azure_1.SecurityStrategies.AUTH_CODE), (request, response) => {
    const name = request.params.name;
    if (!isNaN(name)) {
        response.status(400).send("No string as name");
    }
    else {
        request.session.userName = name;
        response.json({
            message: "Hello, " + name,
        });
    }
});
// Error handler
app.use((err, req, res, next) => {
    err.status = err.status === undefined ? 500 : err.status;
    // if unauthorized
    if (err.status === 401) {
        // destroy session's JWT token
        req.session.idToken = undefined;
        req.session.accessToken = undefined;
    }
    // Send the error message to the user
    res.status(err.status).send(err.message);
});
app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at ${hostname}:${port}`);
});
function validateUserRoleCallback(request, user, issuer, sub, claims, params, requestedResource, passToAuthCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let isAuthorized = false;
            // obtain the list of all AD Groups
            const groups = yield authMiddleware.getAllADGroups();
            if (groups) {
                // iterate through the all groups
                for (const grp of groups) {
                    if (grp.displayName === env.RBAC_GROUP) {
                        const grpId = grp.id;
                        // find if the user is a member of the API group
                        if (authMiddleware.findIfUserIsMemberOfGroup(grpId, user.displayName)) {
                            isAuthorized = true;
                        }
                    }
                }
                if (isAuthorized) {
                    // user is a member of the group allowing access to API
                    return passToAuthCallback(null, user);
                }
                else {
                    // this user doesn't belong to a group that allows access to API
                    return passToAuthCallback(new Error("Unauthorized. User doesn't belong to a group that allows access to API"), user);
                }
            }
        }
        catch (error) {
            console.error(error);
            passToAuthCallback(error, user);
        }
    });
}
//# sourceMappingURL=index.js.map