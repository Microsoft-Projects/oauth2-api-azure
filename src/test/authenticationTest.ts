// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import express from "express";
import session from "express-session";

import { suite, test } from "mocha-typescript";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import { OAuthMiddleware } from "../middleware/security/authentication";
import { IAuthSettings, IPassportOptions, SecurityStrategies } from "../types";

chai.use(chaiAsPromised);

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use(
  session({
    secret: "HelloOAuth2",
    resave: false,
    saveUninitialized: true,
  })
);

const authSettings: IAuthSettings = {
  tenant: "",
  clientId: "23423",
  clientSecret: "23424",
  apiAppId: "sdfsdf",
  redirectUri: "http://ssds",
  validateIssuer: false,
  isB2C: false,
  issuer: "",
  scope: "",
  allowHttpForRedirectUrl: true,
  loggingLevel: "error",
  logginNoPII: false,
  useCookieInsteadOfSession: false,
};
const passportAuthOptions: IPassportOptions = {
  session: false,
  passReqToCallback: true,
  authInfo: true,
  failureMessage: true,
  failWithError: true,
  successMessage: false,
};

const hostname = "http://localhost";
const baseApiUrl = "/api"; // the based relative uri for this Web API

@suite
class OAuthMiddlewareTest extends OAuthMiddleware {
  constructor() {
    super(authSettings, passportAuthOptions, hostname, baseApiUrl);
  }

  public mw = this.authenticate(SecurityStrategies.BEARER);

  @test public "A middleware setAppHandler should be a function"() {
    assert.isFunction(this.setAppHandler(app));
  }

  @test public "A middleware authentication should be a function"() {
    assert.isFunction(this.authenticate(SecurityStrategies.BEARER));
  }
}

suite("request handler calling", () => {
  it("should call next()", async () => {
    const authMiddleware = new OAuthMiddlewareTest();
    const nextSpy = sinon.spy();

    authMiddleware.mw({}, {}, nextSpy);

    return assert.isTrue(nextSpy.calledOnce);
  });
});
