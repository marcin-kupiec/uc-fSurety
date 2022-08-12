import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {

  let result = null;

  let contract = new Contract('localhost', async () => {

    // initialize tabs

    try {
      result = await contract.isOperational();

      let status = DOM.elid('operational-status');
      status.innerText = result;
    } catch (err) {
      console.log('Failed to check operational status', err);
      display(null, 'Operational Status', 'Check if contract is operational', [{
        label: 'Operational Status',
        error: err,
        value: result,
      }]);
    }

    let accountSelect = DOM.elid('available-accounts');
    for (let i = 0; i < contract.availableAccounts.length; i++) {
      accountSelect.add(DOM.makeElement('option', { innerText: contract.availableAccounts[i] }));
    }

    let airlineSelect = DOM.elid("airline");
    for (let key in contract.airlines) {
      airlineSelect.add(DOM.makeElement("option", { innerText: key }));
    }

    let flightSelect = DOM.elid("flight-select");
    for (let i = 0; i < contract.flights.length; i++) {
      flightSelect.add(DOM.makeElement("option", { innerText: contract.flights[i] }));
    }

    // admin panel functions

    DOM.elid('btn-refresh-status').addEventListener('click', async () => {
      await refreshAccountInfo();
    })

    DOM.elid('available-accounts').addEventListener('change', async () => {
      await refreshAccountInfo();
    })

    DOM.elid('btn-operational-toggle').addEventListener('click', async () => {
      let status = DOM.elid('operational-status');
      let newStatus = true;
      if (status.innerText === 'true') {
        newStatus = false;
      }

      try {
        await contract.toggleOperatingStatus(newStatus);
        status.innerText = await contract.isOperational();
      } catch (err) {
        console.log('toggleOperatingStatus error: ', err);
      }
    });

    async function refreshAccountInfo() {
      contract.activeAccount = DOM.elid('available-accounts').value;
      DOM.elid('acc-address').innerText = contract.activeAccount;

      try {
        DOM.elid('acc-registered').innerText = await contract.isAirlineRegistered(contract.activeAccount);
      } catch (err) {
        console.log('isAirlineRegistered error: ', err);
      }

      try {
        DOM.elid('acc-funded').innerText = await contract.isAirlineFunded();
      } catch (err) {
        console.log('isAirlineFunded error: ', err);
      }

      // contract.getPassengerCreditBalance((error, result) => {
      //   if (error) {
      //     console.log('getPassengerCreditBalance error: ' + error);
      //   }
      //   DOM.elid('acc-credit').innerText = result;
      // });

      try {
        DOM.elid('acc-balance').innerText = await contract.web3.eth.getBalance(contract.activeAccount);
      } catch (err) {
        console.log('getBalance error: ', err);
      }

      DOM.elid('acc-owner').innerText = contract.owner;
    }

    // airline panel functions

    DOM.elid('btn-airline-register').addEventListener('click', async () => {
      let airlineName = DOM.elid('airline').value;
      let airlineAddress = contract.airlines[airlineName];

      let err;
      try {
        await contract.registerAirline(airlineAddress, airlineName);
      } catch (error) {
        console.log(`registerAirline name ${airlineName} address ${airlineAddress} error: `, error);
        err = error;
      }

      display('airline-messages', '', '', [{
        label: 'Airline registration',
        error: err,
        value: `Registered airline ${airlineName} by ${contract.activeAccount}`,
      }]);

      await refreshAccountInfo();
    })

    DOM.elid('btn-airline-fund').addEventListener('click', async () => {
      let value = DOM.elid('fund-amount').value;

      let err;
      try {
        await contract.fundAirline(value);
      } catch (error) {
        console.log(`fundAirline value ${value} error: `, error);
        err = error;
      }

      display('airline-messages', '', '', [{
        label: 'Airline funding',
        error: err,
        value: `Funded airline ${contract.getAirlineNameByAccount(contract.activeAccount)} with ${value} ethers`,
      }]);

      await refreshAccountInfo();
    })

    // flights panel

    DOM.elid('btn-flights-register').addEventListener('click', async () => {
      let flightId = DOM.elid('flight-select').value;

      let result, err;
      try {
        result = await contract.registerFlight(flightId);
      } catch (error) {
        console.log(`registerFlight flightId ${flightId} error: `, error);
        err = error;
      }

      display('flight-messages', '', '', [{
        label: 'Flight registration',
        error: err,
        value: `Registered flight ${result[0]} by airline ${contract.getAirlineNameByAccount(result[1])} at ${result[2]}`,
      }]);

      // let flightSelect = DOM.elid("registered-flight-select");
      // for (let i = flightSelect.options.length - 1; i >= 0; i--) {
      //   flightSelect.remove(i);
      // }
      // for (let i = 0; i < contract.flights.length; i++) {
      //   flightSelect.add(DOM.makeElement("option", { innerText: contract.flights[i] }));
      // }
    })

    // User-submitted transaction
    DOM.elid('submit-oracle').addEventListener('click', () => {
      let flight = DOM.elid('flight-number').value;
      // Write transaction
      contract.fetchFlightStatus(flight, (error, result) => {
        display(null, 'Oracles', 'Trigger oracles', [{
          label: 'Fetch Flight Status',
          error: error,
          value: result.flight + ' ' + result.timestamp,
        }]);
      });
    })
  });

})();


function display(container, title, description, results) {
  container = !!container ? container : 'display-wrapper';
  let displayDiv = DOM.elid(container);
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map((result) => {
    let row = section.appendChild(DOM.div({ className: 'row' }));
    row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
    row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
    section.appendChild(row);
  })
  displayDiv.append(section);
}
