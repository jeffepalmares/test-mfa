/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of this license at
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */

var poolData = {
  UserPoolId: "",
  ClientId: "",
};

var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

//---------------Cognito sign-up
function signUp() {
  var email = $("#reg-email").val();
  var username = $("#reg-username").val();
  var password = $("#reg-password").val();
  var name = $("#reg-name").val();

  var attributeList = [];

  var dataEmail = { Name: "email", Value: email };
  var dataName = { Name: "name", Value: name };

  var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(
    dataEmail
  );
  var attributeName = new AmazonCognitoIdentity.CognitoUserAttribute(dataName);

  attributeList.push(attributeEmail);
  attributeList.push(attributeName);

  userPool.signUp(
    username,
    password,
    attributeList,
    null,
    function (err, result) {
      if (err) {
        console.log(err.message || JSON.stringify(err));
        return;
      } else {
        var cognitoUser = result.user;

        var confirmationCode = prompt("Please enter confirmation code:");
        cognitoUser.confirmRegistration(
          confirmationCode,
          true,
          function (err, result) {
            if (err) {
              alert(err.message || JSON.stringify(err));
              return;
            }
            console.log("call result: " + result);
            alert("Registration successful, now sign-in.");
          }
        );

        console.log("user name is " + cognitoUser.getUsername());
      }
    }
  );
}

//---------------Cognito sign-in user
signIn = async () => {
  var username = $("#login-username").val();
  var password = $("#login-password").val();

  var authenticationData = {
    Username: username,
    Password: password,
  };

  var userData = {
    Username: username,
    Pool: userPool,
  };

  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(
    authenticationData
  );
  cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.setAuthenticationFlowType("CUSTOM_AUTH");
  cognitoUser.authenticateUser(authenticationDetails, authCallBack);
};

authCallBack = {
  onSuccess: function (result) {
    var accessToken = result.getAccessToken().getJwtToken();
    var idToken = result.getIdToken().getJwtToken();
    var refreshToken = result.getRefreshToken().getToken();

    $("#mfa-div").html('<div id="mfa-result"></div>');

    $("#idToken").html(
      "<b>ID Token</b><br>" + JSON.stringify(parseJwt(idToken), null, 2)
    );
    $("#accessToken").html(
      "<b>Access Token</b><br>" + JSON.stringify(parseJwt(accessToken), null, 2)
    );
  },
  customChallenge: async function (challengeParameters) {
    console.log("Custom Challenge from Cognito:");
    console.log(challengeParameters);
    var username = $("#login-username").val();

    $("#mfa-div").html('<div id="mfa-iframe" class="iframe_container"></div>');
    const iframe = $("#mfa-iframe");
    BIDStepup.stepup(
      iframe,
      challengeParameters.tenant,
      challengeParameters.community,
      challengeParameters.kosmos_clientId,
      username,
      challengeParameters.state,
      challengeParameters.acr,
      mfa_callback
    );
  },
  onFailure: function (err) {
    console.error("Error authenticateUser:" + err);
    console.log(err.message || JSON.stringify(err));
  },
};

mfa_callback = async (data) => {
  console.log("submit_callback:");
  cognitoUser.sendCustomChallengeAnswer(data, authCallBack);
};

//tabs UI
$(function () {
  $("#tabs").tabs();
});

function parseJwt(token) {
  var base64Url = token.split(".")[1];
  var base64 = base64Url.replace("-", "+").replace("_", "/");
  return JSON.parse(window.atob(base64));
}
