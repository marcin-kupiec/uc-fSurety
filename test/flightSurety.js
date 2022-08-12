const Test = require('../config/testConfig.js');
const BigNumber = require('bignumber.js');
const assert = require('assert');

contract('Flight Surety Tests', async (accounts) => {

  let config;

  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {
    let reverted = false;
    try {
      await config.flightSuretyData.isAirlineRegistered(config.testAddresses[2]);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, 'WizzAir', { from: config.firstAirline });
    } catch (e) {
    }
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('(airline) can register an Airline using registerAirline() if it is funded', async () => {
    // ARRANGE
    let newAirline = accounts[2];

    const funds = await config.flightSuretyData.MINIMUM_FUNDS.call();
    await config.flightSuretyApp.fundAirline({ from: config.firstAirline, value: funds });

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, 'WizzAir', { from: config.firstAirline });
    } catch (e) {
    }
    let result = await config.flightSuretyData.isAirlineRegistered.call(newAirline);

    // ASSERT
    assert.equal(result, true, "Airline should not be able to register another airline if it hasn't provided funding");
  });

  it('(airline) register other airline using consensus', async () => {
    try {
      await config.flightSuretyApp.registerAirline(accounts[3], 'Udacity Airline 3', { from: config.firstAirline });
      await config.flightSuretyApp.registerAirline(accounts[4], 'Udacity Airline 4', { from: config.firstAirline });
      await config.flightSuretyApp.registerAirline(accounts[5], 'Udacity Airline 5', { from: config.firstAirline });
    } catch (e) {
      console.log(e);
    }

    let isRegistered = await config.flightSuretyApp.isAirlineRegistered.call(accounts[5]);
    assert.equal(isRegistered, false, 'Airline should wait to get votes');

    let airlinesCount = await config.flightSuretyData.airlinesCount.call();
    assert.equal(airlinesCount, 4, `Airlines count should be 4 - one waiting for votes: expected 4 got ${airlinesCount}`);

    // fund another airline
    const funds = await config.flightSuretyData.MINIMUM_FUNDS.call();
    await config.flightSuretyApp.fundAirline({ from: accounts[3], value: funds });
    // register same airline using another airline
    await config.flightSuretyApp.registerAirline(accounts[5], 'Udacity Airline 5', { from: accounts[3] });

    isRegistered = await config.flightSuretyApp.isAirlineRegistered.call(accounts[5]);
    assert.equal(isRegistered, true, 'Airline should be registered');

    airlinesCount = await config.flightSuretyData.airlinesCount.call();
    assert.equal(airlinesCount, 5, `Airlines count should be 5: expected 5 got ${airlinesCount}`);
  });

  it('(flight) can register a flight using registerFlight()', async () => {
    let flightTimestamp = Math.floor(Date.now() / 1000);
    let flightCode = 'CODE1';

    await config.flightSuretyApp.registerFlight(flightCode, flightTimestamp, { from: config.firstAirline });

    let isRegistered = await config.flightSuretyApp.isFlightRegistered.call(flightCode, flightTimestamp, config.firstAirline);
    assert.equal(isRegistered, true, 'Flight should be registered');
  });

  it('(flight) cannot register same flight twice', async () => {
    let flightTimestamp = Math.floor(Date.now() / 1000);
    let flightCode = 'CODE1';

    let reverted = false;
    try {
      await config.flightSuretyApp.registerFlight(flightCode, flightTimestamp, { from: config.firstAirline });
    } catch {
      reverted = true;
    }

    let isRegistered = await config.flightSuretyApp.isFlightRegistered.call(flightCode, flightTimestamp, config.firstAirline);
    assert.equal(isRegistered, true, 'Flight should be registered');
    assert.equal(reverted, true);
  });
});
