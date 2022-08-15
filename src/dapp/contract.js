import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
  constructor(network, callback) {

    let config = Config[network];
    this.networkConfig = config;
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.web3Socket = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
    this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
    this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
    this.flightSuretyAppWithSockets = new this.web3Socket.eth.Contract(FlightSuretyApp.abi, config.appAddress);
    this.appAddress = config.appAddress;

    this.initialize(callback);
    this.owner = null;
    this.activeAccount = null;
    this.availableAccounts = [];
    this.airlines = {};
    this.passengers = [];
    this.flightsRegistered = {};
    this.flights = [];
    this.events = [];
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

      this.flights = [
        'LAI-ABE',
        'DHA-LCY',
        'LCY-DHA',
        'ABE-LAI',
        'BRU-BER',
        'BER-BRU',
        'SFO-JFK',
        'FKS-HKG',
        'BER-HKG',
        'YWG-YYC',
        'JFK-SFO',
        'CPT-CRK',
        'LAI-HGK',
        'CRK-CPT',
        'HKG-BER',
      ];


      this.flightSuretyAppWithSockets.events.FlightStatusInfo({
        fromBlock: 'latest',
      }, (error, event) => {
        if (error) {
          console.log(error);
          return;
        }

        const { airline, flight, timestamp, status } = event.returnValues;

        console.log(`Received ${event.event} event`, airline, flight, timestamp, status);
        this.events.push({
          name: 'FlightStatusInfo',
          eventTimestamp: new Date().toISOString(),
          body: { airline, flight, timestamp, status },
        })
      });

      this.authorizeAppToData()
        .then(() => callback())
        .catch(err => {
          console.log("Could not authorize the App contract");
          console.log(err);
        });
    });
  }

  getAirlineNameByAccount(address) {
    return Object.entries(this.airlines).filter(([k, v]) => v === address)[0][0];
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

  async registerFlight(flightCode) {
    let timestamp = Math.floor(Date.now() / 1000);
    let airline = this.activeAccount;

    await this.flightSuretyApp.methods.registerFlight(flightCode, timestamp).send({
      from: this.activeAccount,
      gas: this.networkConfig.gas,
      gasPrice: this.networkConfig.gasPrice,
    });
    this.flightsRegistered[flightCode] = [flightCode, airline, timestamp];

    return [flightCode, airline, timestamp];
  }

  insureFlight(airlineAddress, flightCode, timestamp, value) {
    return this.flightSuretyApp.methods
      .insureFlight(airlineAddress, flightCode, timestamp)
      .send({
        from: this.activeAccount,
        value: this.web3.utils.toWei(String(value), 'ether'),
        gas: this.networkConfig.gas,
        gasPrice: this.networkConfig.gasPrice,
      });
  }

  withdrawCredits() {
    return this.flightSuretyApp.methods.withdrawCredits().send({ from: this.activeAccount });
  }

  getCreditBalance() {
    return this.flightSuretyApp.methods.getCreditBalance().call({ from: this.activeAccount });
  }

  fetchFlightStatus(flightCode, airlineAddress, timestamp) {
    return this.flightSuretyApp.methods
      .fetchFlightStatus(airlineAddress, flightCode, timestamp)
      .send({ from: this.owner });
  }

  getEvents() {
    return this.events;
  }
}