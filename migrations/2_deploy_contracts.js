const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");
const fs = require('fs');

module.exports = function (deployer) {

  const firstAirlineName = 'Fast Airlines';
  deployer.deploy(FlightSuretyData, firstAirlineName)
    .then(() => {
      return deployer.deploy(FlightSuretyApp, FlightSuretyData.address)
        .then(() => {
          let config = {
            localhost: {
              url: 'http://localhost:9545',
              dataAddress: FlightSuretyData.address,
              appAddress: FlightSuretyApp.address,
              gas: 4712388,
              gasPrice: 100000000000,
            },
          }
          fs.writeFileSync(__dirname + '/../src/dapp/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
          fs.writeFileSync(__dirname + '/../src/server/config.json', JSON.stringify(config, null, '\t'), 'utf-8');
        });
    });
}