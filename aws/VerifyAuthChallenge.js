/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of this license at
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */
const fetch = require("node-fetch");
const aws = require("aws-sdk");

let tenantDNS = process.env.ONEK_TENANT,
  communityName = process.env.ONEK_COMMUNITY,
  clientId = process.env.ONEK_CLIENTID,
  secretName = process.env.ONEK_SECRET_NAME,
  secretId;

let smClient = new aws.SecretsManager({});

exports.handler = async (event) => {
  try {
    console.log(event);

    event.response = {
      answerCorrect: false,
    };

    if (!event || !event.request || !event.request.challengeAnswer) {
      console.log("invalid challengeAnswer");
      return event;
    }

    const challenge = JSON.parse(event.request.challengeAnswer);

    console.log(challenge);

    const promise = new Promise((resolve, reject) => {
      smClient.getSecretValue({ SecretId: secretName }, function (err, data) {
        if (err) {
          console.error(err);
          return reject(err);
        }

        console.log(data);

        if ("SecretString" in data) {
          secretId = data.SecretString;
        }

        resolve();
      });
    });

    await promise;

    const basicAuth = Buffer.from(`${clientId}:${secretId}`).toString("base64");
    const myHeaders = {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const redirectUri = `https://${tenantDNS}/admin/${communityName}/post_stepup`;
    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "authorization_code");
    urlencoded.append("code", challenge.code);
    urlencoded.append("redirect_uri", redirectUri);

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: urlencoded,
      redirect: "follow",
    };

    const serviceUrl = `https://${tenantDNS}/oauth2/community/${communityName}/v1/token`;
    console.log(`OIDC Service URL: ${serviceUrl}`);

    const api_response = await fetch(serviceUrl, requestOptions);

    const json = await api_response.json();

    console.log(`Api Response: ${JSON.stringify(json || {})}`);

    if (json && !json.error) {
      event.response.answerCorrect = json.id_token != null;
    }

    console.log(event);

    return event;
  } catch (err) {
    console.log(err);
    return event;
  }
};
