const Srf = require('drachtio-srf');
const srf = new Srf();
var AWS = require("aws-sdk");
var constants = require('./constants');
const registrationParser = require('drachtio-mw-registration-parser');
srf.use((req, res, next) => {
  next();
});
srf.use('register', registrationParser);


/************ SETUP AWS DYNAMODB**************/
AWS.config.update({
  "region": constants.REGION,
});


/************ SETUP SIP SERVER CONNECTION**************/
srf.connect({
  host: constants.SIP_HOST,
  port: constants.SIP_PORT,
  secret: constants.SIP_SECRATE
});



/************ SETUP SERVER EVENTS**************/

/************ EVENT RECEIVED WHEN CONNECTED TO THE SERVER**************/
srf.on('connect', (err, hostport) => {
  console.log(`connected to a drachtio server listening on: ${hostport}`);
}).on('error', (err) => {
  console.log(`Error connecting to drachtio server: ${err}`);
});


/************ EVENT FIRE WHEN USER REGISTER TO THE SERVER**************/
srf.register((req, res) => {
  try {
    var data = {};
    if (req.registration && req.registration.type && req.registration.type == 'register') {
      var contact = req.registration.contact[0]
      data.name = contact.name;
      data.uri = contact.uri;
    }
    console.log('New registration request started',JSON.stringify(data));
    res.send(200, {
      headers: {
        'X-Freelancer-Project': JSON.stringify(data)
      }
    });
  } catch (error) {
    console.log("Error while registring user : " + error);
  }
});


/************ EVENT FIRE ON SUBSCRIPTION**************/
srf.subscribe((req, res) => {
  console.log('New subscribe request started',JSON.stringify(req));
});

/************ EVENT FIRE ON NEW INVITE**************/
srf.invite((req, res) => {
  console.log("Invite Request : " + JSON.stringify(req));
  console.log("Invite Response : " + JSON.stringify(res));
  res.send(486, 'So sorry, busy right now', {
    headers: {
      'X-Custom-Header': 'because why not?'
    }
  });
});

/************ EVENT FIRE ON SERVER PING BY CLIENT **************/
srf.options(async (req, res) => {
  console.log('New OPTIONS request from',req.source_address,JSON.stringify(req.headers));
  console.log('New Raw OPTIONS request',req.raw);
  var data = await getHeaderValueFromDB(req.source_address);
  res.send(200, {
    headers: {
      'X-Freelancer-Project': JSON.stringify(data)
    }
  });
});

async function getHeaderValueFromDB(SourceIp) {
  try {
    var result;
    var headerString="Option Response";
    let docClient = new AWS.DynamoDB.DocumentClient();
    params = {
      TableName: constants.TABLE_NAME,
      Key: {
        "SourceIp": SourceIp,
        "HeaderValue": headerString,
      }
    };
    var data = await docClient.get(params).promise();
    if (data && data.Item) {
      result=data.Item;
    }else{
      result=await putItem(SourceIp,headerString);
    }
    return result;
  } catch (error) {
    console.log(`Error in fetching item from dynamodb ${error}`);
  }
  return result;
}


async function putItem(SourceIp,headerString) {
  try {
    let docClient = new AWS.DynamoDB.DocumentClient();
    var params = {
      TableName: constants.TABLE_NAME,
      Item: {
        "SourceIp": SourceIp,
        "HeaderValue": headerString,
      }
    };
    var data=docClient.put(params).promise();  
    if(data && data.Item){
      return data.Item
    }
  } catch (error) {
    console.log(`Error while putting item to the dynamodb : ${error}` );
  }
  return null;
}

