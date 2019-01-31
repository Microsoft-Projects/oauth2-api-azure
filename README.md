**OAuth2 API Azure**
(https://github.com/Microsoft-Projects/oauth2-api-azure/)

  A node OAuth2 API on Azure wrapper supporting non-interactive and interactive authentication flow scenarios for [typescript](https://www.typescriptlang.org/).

```js
import * as oauth from "oauth2-api-azure";
import * as authMiddleware from "oauth2-api-azure.middleware";
import express = require("express");
import session from "express-session";

let app = express();
app.use(session());

// load auth settings
const authSettings: IAuthSettings { ... }
const passportAuthOptions: IPassportOptions { ... }

// init auth params
oauth.authInit(authSettings, validateUserRoleCallback);

// init auth middleware
const authMiddleware = new authentication.OAuthMiddleware(authSettings,passportAuthOptions, apiHostname, baseApiUrl);

// add Auth routes
app = authMiddleware.setAppHandler(app);

app.get('/api/get',
    // here goes the Azure OAuth2 Middleware
    authMiddleware.authenticate(SecurityStrategies.BEARER),
    (req, res) => {
        res.send('Hello World');
});

app.listen(3000)
```

## Installation

This is a [Node.js](https://nodejs.org/en/) module available through the
[npm registry](https://www.npmjs.com/).

Before installing, [download and install Node.js](https://nodejs.org/en/download/).
Node.js 0.10 or higher is required.

Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```bash
$ npm install oauth2-api-azure
```

Before beginning, you must configure and register your Web API in your Azure AD subscription. It is also expected that you are a Global Admin on your Azure AD.
Follow our [Azure AD Configuration Guide](AzureADConfigurationGuide.md) for more details.

Then, use our [sample projects](./examples) with your Azure AD settings to run and test your secure Web API.


## Features

  * Hides complexity of OAuth2 implementation
  * Focus on fast get started experience
  * Supports interactive (user sign-in) and non-interactive (bearing the JWT token) authentication flow scenarios
  * Test coverage
  * Proven on multiple customer engagements

## Docs & Community

  * [OAuth2 Azure API Documentation](./doc)
  * [Microsoft Azure AD v2](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-overview) on a new Azure AD 2.0
  * [OAuth 2.0](https://oauth.net/2/) for Official OAuth 2.0 documentation
  * [Azure AD Authentication Libraries](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-authentication-libraries)
  
## Examples

  To view the examples, clone the OAuth2-api-azure repo and install the dependencies:

```bash
$ git clone https://github.com/Microsoft-Projects/oauth2-api-azure.git --depth 1
$ cd oauth2-api-azure
$ npm install

```

First, you must configure each example, please make sure the .env file exists in each sample directory and contains the valid settings for the following environment variables:
* TENANT_ID="d197a05e-...."
* CLIENT_ID="3d95c..."
* CLIENT_SECRET="LMJ#])?..."
* RESOURCE_ID="0472a9...."
* PORT=3000

Then install, configure and run whichever example you want:

```bash
$ cd examples/oauth2-bearer
$ npm install
$ npm start
```

## Tests

  To run the test suite, first install the dependencies, then run `npm test`:

```bash
$ npm install
$ npm test
```

## License

  [MIT](LICENSE)
