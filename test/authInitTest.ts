// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { suite, test } from "mocha-typescript";
import chai, { assert } from "chai";
import chaiAsPromised from "chai-as-promised";
import { authInit } from "../src/oauth2-api-azure";
import { IAuthSettings } from "../src/types";

chai.use(chaiAsPromised);

suite("test client id", () => {
  test("authInit() throws an error when missing client id", async () => {
    const authSettings: IAuthSettings = {
      tenant: "",
      clientId: "",
      clientSecret: "234234",
      apiAppId: "23424",
      redirectUri: "http://sss",
      validateIssuer: false,
      isB2C: false,
      issuer: "",
      scope: "",
      allowHttpForRedirectUrl: true,
      loggingLevel: "error",
      logginNoPII: false,
      useCookieInsteadOfSession: false,
    };

    return assert.isRejected(authInit(authSettings, null));
  });

  test("authInit() throws an error when missing client secret", async () => {
    const authSettings: IAuthSettings = {
      tenant: "",
      clientId: "23423",
      clientSecret: "",
      apiAppId: "23424",
      redirectUri: "http://sss",
      validateIssuer: false,
      isB2C: false,
      issuer: "",
      scope: "",
      allowHttpForRedirectUrl: true,
      loggingLevel: "error",
      logginNoPII: false,
      useCookieInsteadOfSession: false,
    };

    return assert.isRejected(authInit(authSettings, null));
  });

  test("authInit() throws an error when redirect Uri is not valid", async () => {
    const authSettings: IAuthSettings = {
      tenant: "",
      clientId: "23423",
      clientSecret: "23424",
      apiAppId: "sdfsdf",
      redirectUri: "sdfsd",
      validateIssuer: false,
      isB2C: false,
      issuer: "",
      scope: "",
      allowHttpForRedirectUrl: true,
      loggingLevel: "error",
      logginNoPII: false,
      useCookieInsteadOfSession: false,
    };

    return assert.isRejected(authInit(authSettings, null));
  });
});
