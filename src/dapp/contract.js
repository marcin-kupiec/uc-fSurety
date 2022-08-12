import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
  constructor(network, callback) {

    let config = Config[network];
    this.networkConfig = config;
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
    this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
    this.appAddress = config.appAddress;

    this.initialize(callback);
    this.owner = null;
    this.activeAccount = null;
    this.availableAccounts = [];
    this.airlines = {};
    this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];
      this.activeAccount = accts[0];

      for (let i = 0; i < accts.length - 1; i++) {
        this.availableAccounts.push(accts[i])
      }

      this.airlines['RyanAir'] = accts[0];
      this.airlines['WizzAir'] = accts[1];
      this.airlines['LOT'] = accts[2];
      this.airlines['Lufthansa'] = accts[3];
      this.airlines['TurkishAir'] = accts[4];
      this.airlines['KLM'] = accts[5];
      this.airlines['EnterAir'] = accts[6];

      this.authorizeAppToData()
        .then(() => callback())
        .catch(err => {
          console.log("Could not authorize the App contract");
          console.log(err);
        });
    });
  }

  isOperational() {
    return this.flightSuretyApp.methods.isOperational().call({ from: this.owner });
  }

  authorizeAppToData() {
    return this.flightSuretyData.methods.authorizeCaller(this.appAddress).send({ from: this.owner });
  }

  toggleOperatingStatus(newStatus) {
    return this.flightSuretyData.methods.setOperatingStatus(newStatus).send({ from: this.activeAccount });
  }

  registerAirline(address, name) {
    return this.flightSuretyApp.methods.registerAirline(address, name).send({
      from: this.activeAccount,
      gas: this.networkConfig.gas,
      gasPrice: this.networkConfig.gasPrice,
    });
  }

  isAirlineRegistered(airline) {
    return this.flightSuretyApp.methods.isAirlineRegistered(airline).call({ from: this.activeAccount });
  }

  fundAirline(value) {
    return this.flightSuretyApp.methods.fundAirline().send({
      from: this.activeAccount,
      value: this.web3.utils.toWei(value, 'ether'),
    });
  }

  isAirlineFunded() {
    return this.flightSuretyApp.methods.isAirlineFunded(this.activeAccount).call({ from: this.activeAccount });
  }

  fetchFlightStatus(flight, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    }
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload);
      });
  }
}