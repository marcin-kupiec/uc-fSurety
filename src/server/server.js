import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let STATUS_CODE_UNKNOWN = 0;
let STATUS_CODE_ON_TIME = 10;
let STATUS_CODE_LATE_AIRLINE = 20;
let STATUS_CODE_LATE_WEATHER = 30;
let STATUS_CODE_LATE_TECHNICAL = 40;
let STATUS_CODE_LATE_OTHER = 50;
let STATUS_CODES = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER,
];

const TEST_ORACLES_COUNT = 20;
let currentStatus = STATUS_CODE_ON_TIME;
let oracles = {};

initOracles().catch(err => console.log(err));

flightSuretyApp.events.allEvents({
  fromBlock: 'latest',
}, function (error, event) {
  if (error) {
    console.log(error);
  } else {
    console.log(event.event, event.returnValues);
  }
});

flightSuretyApp.events.OracleRequest({
  fromBlock: 'latest',
}, async function (error, event) {
  if (error) {
    console.log(error);
    return;
  }

  const { index, airline, flight, timestamp } = event.returnValues;

  console.log(`OracleRequest: `, index, airline, flight, timestamp);
  console.log(`Triggered index: ${index}`);
  for (let i = 0; i < Object.entries(oracles).length; i++) {
    let oracleAddress = Object.entries(oracles)[i][0];
    let indexes = Object.entries(oracles)[i][1];

    if (!indexes.find(idx => idx === index)) {
      continue;
    }

    let status = STATUS_CODES[getRandomNumber(0, STATUS_CODES.length - 1)];
    console.log(`Oracle: ${oracleAddress} triggered with status ${status}. Indexes: ${indexes}.`);
    await flightSuretyApp.methods
      .submitOracleResponse(index, airline, flight, timestamp, status)
      .send({
        from: oracleAddress,
        gas: 500000,
        gasPrice: 20000000,
      });
  }
});

const app = express();

app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!',
  })
})

app.get('/api/status/:status', (req, res) => {
  const status = req.params.status;
  let message = 'Status changed to: ';

  switch (status) {
    case '10':
      currentStatus = STATUS_CODE_ON_TIME;
      message = message.concat('ON TIME');
      break;
    case '20':
      currentStatus = STATUS_CODE_LATE_AIRLINE;
      message = message.concat('LATE AIRLINE');
      break;
    case '30':
      currentStatus = STATUS_CODE_LATE_WEATHER;
      message = message.concat('LATE WEATHER');
      break;
    case '40':
      currentStatus = STATUS_CODE_LATE_TECHNICAL;
      message = message.concat('LATE TECHNICAL');
      break;
    case '50':
      currentStatus = STATUS_CODE_LATE_OTHER;
      message = message.concat('LATE OTHER');
      break;
    default:
      currentStatus = STATUS_CODE_UNKNOWN;
      message = message.concat('UNKNOWN');
      break;
  }
  res.send({
    message: message,
  })
});

async function initOracles() {
  const registrationFee = await flightSuretyApp.methods.REGISTRATION_FEE().call();

  let accountList = await web3.eth.getAccounts();
  let accounts = accountList.slice(20, 20 + TEST_ORACLES_COUNT);

  for (let i = 0; i < TEST_ORACLES_COUNT; i++) {
    await flightSuretyApp.methods.registerOracle().send({
      from: accounts[i],
      value: registrationFee,
      gas: 5000000,
      gasPrice: 20000000,
    });

    oracles[accounts[i]] = await flightSuretyApp.methods.getMyIndexes().call({ from: accounts[i] });
  }
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

export default app;
