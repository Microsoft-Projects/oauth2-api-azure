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
const express = require("express");
const express_session_1 = __importDefault(require("express-session"));
const oauth = __importStar(require("../../../lib/index"));
const authentication = __importStar(require("../../../lib/middleware/security/authentication"));
const types_1 = require("../../../lib/types");
let app = express();
app.use(express.json());
app.use(express.urlencoded());
const port = 3000; // default port to listen
const baseApiUrl = `/api`;
const authSettings = {
    tenant: "d197a05e-5952-4466-88ca-1bc6d05eee59",
    clientId: "3d95c545-6c63-4c95-9ae0-7ecc61774fd3",
    clientSecret: "#])?%DuL_}6[T^E/};/}a{n-&**K%-s24_ra*]A8lxkc#}-)Gn(}M;PCD1./{${",
    apiAppId: "0472a99e-fc93-4804-be57-e7b99ed6c057",
    redirectUri: `http://localhost:${port}${baseApiUrl}/auth/getAToken`,
    validateIssuer: false,
    isB2C: false,
    issuer: "",
    scope: "",
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
app.use(express_session_1.default({
    secret: "HelloWorld",
    resave: false,
    saveUninitialized: true
}));
// initialize OAuth passport strategy
oauth.authInit(authSettings, validateUserRoleCallback, baseApiUrl);
// initialize OAuth middleware
const authMiddleware = new authentication.OAuthMiddleware(authSettings, passportAuthOptions, `http://localhost:${port}${baseApiUrl}`);
// Couple the app to the Auth routes
app = authMiddleware.setAppHandler(app);
// define a route handler for the default home page
app.get("/", (req, res) => {
    res.send(`API Home Page. Try to call API endpoint with your name: http://localhost:${port}/api/hello/<your name>`);
});
app.get(`${baseApiUrl}/hello/:name`, authMiddleware.authenticate(types_1.SecurityStrategies.BEARER), (request, response) => {
    const name = request.params.name;
    if (!isNaN(name)) {
        response
            .status(400)
            .send("No string as name");
    }
    else {
        request.session.userName = name;
        response.json({
            "message": "Hello, " + name
        });
    }
});
app.get(`${baseApiUrl}/name`, authMiddleware.authenticate(types_1.SecurityStrategies.AUTH_CODE), (request, response) => {
    const name = request.session.userName;
    if (!isNaN(name)) {
        response
            .status(400)
            .send("No name was stored. Try to call /hello API endpoint with the name");
    }
    else {
        response.json({
            "message": "Your name is " + name
        });
    }
});
// Error handler
app.use((err, req, res, next) => {
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
function validateUserRoleCallback(userId, issuer, scopes, params, requestedResource, passToAuthCallback) {
    return __awaiter(this, void 0, void 0, function* () {
        const isAuthorized = true;
        if (isAuthorized && userId) {
            passToAuthCallback(null, userId);
        }
        else {
            passToAuthCallback(new Error("Unauthorized"), userId);
        }
        return Promise.resolve(isAuthorized);
    });
}
//# sourceMappingURL=index.js.map