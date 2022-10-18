/**
 * Copyright (c) 2018, 1Kosmos Inc. All rights reserved.
 * Licensed under 1Kosmos Open Source Public License version 1.0 (the "License");
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of this license at
 *    https://github.com/1Kosmos/1Kosmos_License/blob/main/LICENSE.txt
 */

class BIDStepup {
  static stepup(
    element,
    tenant_dns,
    community_name,
    client_id,
    username,
    state,
    acr_method,
    callback
  ) {
    //Remove iFrame if already exists on stepup
    this.removeIFrame(element);

    //Redirect URL for postback data back to parent frame
    const redirectUrl = `https://${tenant_dns}/admin/${community_name}/post_stepup`;

    const claimJson = this.returnClaim(acr_method, username);

    //OIDC URL for iframe to render
    let oidc_url = encodeURI(
      `https://${tenant_dns}/oauth2/community/${community_name}/v1/authorize?response_type=code&client_id=${client_id}&scope=openid&redirect_uri=${redirectUrl}&state=${state}&claims=${claimJson}`
    );

    //Render iframe in provided DOM element
    this.renderIframe(oidc_url, element, callback);
  }

  static renderIframe(oidc_url, element, callback) {
    var iframe = document.createElement("iframe");
    iframe.setAttribute("src", oidc_url);
    iframe.setAttribute("title", "BlockID - Step Up");
    iframe.setAttribute("id", "stepup_iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    element[0].appendChild(iframe);
    this.listenPostMessage(callback, element);
  }

  static returnClaim(acr_method, username) {
    let acr_array = acr_method.replace(/'/g, "").replace(/"/g, "");
    acr_array = acr_array.split(",");

    return JSON.stringify({
      id_token: {
        username: `${username}`,
        acr: {
          essential: true,
          values: acr_array,
        },
      },
    });
  }

  static listenPostMessage(callback, element) {
    // Listen to the post message from the parent window
    window.addEventListener(
      "message",
      (e) => {
        const key = e.message ? "message" : "data";
        const data = e[key];

        callback(data);
        this.removeIFrame(element);
      },
      false
    );
  }

  static removeIFrame(element) {
    const iframeElement = document.getElementById("stepup_iframe");
    if (iframeElement) element[0].removeChild(iframeElement);
  }
}
