const HDWalletProvider = require('@truffle/hdwallet-provider');
const mnemonic = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat';

module.exports = {
  networks: {
    develop: {
      accounts: 50,
      network_id: '*',
      host: '127.0.0.1',
      port: 9545,
    },
    development: {
      // provider: function() {
      //   return new HDWalletProvider(mnemonic, 'http://127.0.0.1:8545/', 0, 50);
      // },
      network_id: '*',
      host: '127.0.0.1',
      port: 9545,
    },
  },
  compilers: {
    solc: {
      version: '^0.4.24',
    },
  },
};