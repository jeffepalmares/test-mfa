/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of this license at
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
exports.handler = (event, context, callback) => {
  console.log(event);
  console.log(event.request.session);
  console.log(context);

  // If user is not registered
  if (event.request.userNotFound) {
    event.response.issueToken = false;
    event.response.failAuthentication = true;
    throw new Error("User does not exist");
  }

  if (
    event.request.session &&
    event.request.session.length &&
    event.request.session.slice(-1)[0].challengeName === "CUSTOM_CHALLENGE" &&
    event.request.session.slice(-1)[0].challengeResult === true
  ) {
    // The user provided the right answer; succeed auth
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else if (
    event.request.session &&
    event.request.session.length &&
    event.request.session.slice(-1)[0].challengeName === "PASSWORD_VERIFIER" &&
    event.request.session.slice(-1)[0].challengeResult === true
  ) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = "CUSTOM_CHALLENGE";
  } else if (
    event.request.session &&
    event.request.session.length &&
    event.request.session.slice(-1)[0].challengeName === "SRP_A"
  ) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = "PASSWORD_VERIFIER";
  } else if (
    event.request.session.length >= 5 &&
    event.request.session.slice(-1)[0].challengeResult === false
  ) {
    event.response.issueToken = false;
    event.response.failAuthentication = true;
    throw new Error("Invalid credentials");
  } else {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = "CUSTOM_CHALLENGE";
  }

  // Return to Amazon Cognito
  callback(null, event);
};
