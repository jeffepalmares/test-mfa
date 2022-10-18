# One K MFA integration with Amazon Cognito

This project is a demonestration of how to integrate One K Multi-Factor Authentication with Amazon Cognito user pools.

# Requirements

- AWS account and permissions to create CloudFromation stacks, Cognito resources and lambda functions
- Nodejs and NPM

# Deployment steps

###### Clone the project

```sh
$ git clone https://github.com/aws-samples/duomfa-with-amazon-cognito.git
$ cd duomfa-with-amazon-cognito
```

###### Create AWS resources

Create AWS resaources by running the CLI command below, replace ikey, skey and akey with the correct values from previous steps. **Note that creating these resources might incur cost in your account.**

This command will create Cognito resources, lambda functions that will be used to drive custom authentication flow and it will also create a secret in secrets manager to store Kosmos keys

```sh
$ aws cloudformation create-stack --stack-name kosmos-mfa-cognito --template-body file://aws/UserPoolTemplate.yaml --capabilities CAPABILITY_AUTO_EXPAND CAPABILITY_IAM CAPABILITY_NAMED_IAM --parameters ParameterKey=kosmosClienteId,ParameterValue={KOSMOS_CLIENTE_ID} ParameterKey=kosmosTenant,ParameterValue={KOSMOS_TENANT_DNS} ParameterKey=kosmosCommunity,ParameterValue={KOSMOS_COMMUNITY} ParameterKey=kosmosSecretId,ParameterValue={KOSMOS_SECRET_ID}

```

Wait for the stack to be created successfully and then get the user-pool-id and app-client-id from outputs section. you can do this from CloudFromation console or using describe-stacks command

```sh
$ aws cloudformation describe-stacks --stack-name kosmos-mfa-cognito
```

###### Update and run the application

Edit the file public/view-client.js to use the new user-pool that you just created.

```javascript
var poolData = {
  UserPoolId: "user_pool_id",
  ClientId: "app_client_id",
};
```

Install and run the application

```sh
$ npm install
$ node server.js
```

Here is a quick demo of deploying and running this project in a fresh Cloud9 environment. If you run this application in your local machine, you need to configure SSL and access the application with HTTPS.

[![Watch the demo](https://duomfa-with-amazon-cognito.s3-us-west-2.amazonaws.com/Duo-MFA-with-cognito.gif)](https://duomfa-with-amazon-cognito.s3-us-west-2.amazonaws.com/Duo-MFA-with-cognito.mp4)

[first steps]: https://duo.com/docs/duoweb#first-steps
[generate akey]: https://duo.com/docs/duoweb#1.-generate-an-akey

## Notes about implementation

###### User registration

Registration is performed by collecting user data in UI and making a call to `signUp()` in /public/view-client.js
This call creates a user in Cognito, an automated email will be sent to verify email address and a prompt will be displayed to collect verification pin.

###### User authentication

Authentication starts by collecting username and password then making a call to `signIn()` method in /public/view-client.js
`signIn()` starts a custom authentication flow with secure remote password (SRP). Cognito then responds with a custom challenge which is used to initialize and display Kosmos MFA iframe.

Notice the call to `cognitoUser.authenticateUser(authenticationDetails, authCallBack);` the custom challenge will be sent to authCallBack function and this is where Kosmos SDK is initialized and used as below:

```javascript
//render Duo MFA
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
```

This will render Kosmos iframe to the user with instructions to either setup their MFA preferences, if this is the first sign-in attempt, or initiate MFA according to saved settings.

###### Define Auth Challenge

This lamda function is triggered when authentication flow is CUSTOM_AUTH to evaluate the authentication progress and decide what is the next step. For reference, the code of this lambda trigger is under aws/DefineAuthChallenge.js

Define auth challenge will go through the logic below to decide next challenge:

```javascript
/**
 * 1- if user doesn't exist, throw exception
 * 2- if CUSTOM_CHALLENGE answer is correct, authentication successful
 * 3- if PASSWORD_VERIFIER challenge answer is correct, return custom challenge. This is usually the 2nd step in SRP authentication
 * 4- if challenge name is SRP_A, return PASSWORD_VERIFIER challenge. This is usually the first step in SRP authentication
 * 5- if 5 attempts with no correct answer, fail authentication
 * 6- default is to respond with CUSTOM_CHALLENGE --> password-less authentication
 * */
```

###### Create Auth Challenge

This lambda function is triggered when the next step (returned from define auth challenge) is CUSTOM_CHALLENGE. For reference, the code of this lambda trigger is under aws/CreateAuthChallenge.js

This function will load one kosmos variables and provide to front end be able to follow the step up flow.

###### Verify Auth Challenge

This lambda will be triggered when challenge response is passed on from client to Cognito service, this is done throug the call `cognitoUser.sendCustomChallengeAnswer(data , authCallBack);`
challenge response includes the autheticated code response generated from One Kosmos MFA, this response will be validated exchanging the code by the id_token from One Kosmos. For reference, the code of this lambda trigger is under aws/VerifyAuthChallenge.js
