// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as jwt from "jsonwebtoken";

function validateAudience(token: string, audience: string): boolean {
  const decodedTokenResult = jwt.decode(token, {
    complete: true,
    json: true,
  });
  const decodedToken = decodedTokenResult as { [key: string]: any };
  if (decodedToken === null) {
    return false;
  }
  return decodedToken.payload.aud === audience;
}

export { validateAudience };
