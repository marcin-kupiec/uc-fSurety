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
      display('Operational Status', 'Check if contract is operational', [{
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

    // admin panel functions

    DOM.elid('btn-operational-status').addEventListener('click', async () => {
      try {
        let status = DOM.elid('operational-status');
        status.innerText = await contract.isOperational();
      } catch (err) {
        console.log('isOperational error: ', err);
      }
    });

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

      console.log(airlineName, airlineAddress);
      try {
        let result = await contract.registerAirline(airlineAddress, airlineName);
        displayAirlineMessage('Register:', null, result);
      } catch (err) {
        console.log(`registerAirline name ${airlineName} address ${airlineAddress} error: `, err);
        displayAirlineMessage('Register:', err);
      }

      await refreshAccountInfo();
    })

    DOM.elid('btn-airline-fund').addEventListener('click', async () => {
      let value = DOM.elid('fund-amount').value;

      try {
        await contract.fundAirline(value);
        displayAirlineMessage('Fund:', null, result);
      } catch (err) {
        console.log(`fundAirline value ${value} error: `, err);
        displayAirlineMessage('Fund:', err);
      }

      await refreshAccountInfo();
    })

    // User-submitted transaction
    DOM.elid('submit-oracle').addEventListener('click', () => {
      let flight = DOM.elid('flight-number').value;
      // Write transaction
      contract.fetchFlightStatus(flight, (error, result) => {
        display('Oracles', 'Trigger oracles', [{
          label: 'Fetch Flight Status',
          error: error,
          value: result.flight + ' ' + result.timestamp,
        }]);
      });
    })
  });

})();


function display(title, description, results) {
  let displayDiv = DOM.elid('display-wrapper');
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

function displayAirlineMessage(label, error, result) {
  let displayDiv = DOM.elid("airline-messages");
  let section = DOM.section();
  let row = section.appendChild(DOM.div({ className: 'row' }));
  row.appendChild(DOM.div({ className: 'col-sm-1 field' }, label));
  if (error) {
    console.log('isAirlineRegistered error: ' + error);
  }
  row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, String(result)));
  section.appendChild(row);
  displayDiv.append(section);
  if (displayDiv.childElementCount > 3) {
    displayDiv.removeChild(displayDiv.firstChild);
  }
}