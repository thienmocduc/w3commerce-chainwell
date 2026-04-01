require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });
module.exports = {
  paths: { sources: './src', tests: './test', cache: './cache', artifacts: './artifacts' },
  solidity: { version:"0.8.24", settings:{optimizer:{enabled:true,runs:200}} },
  networks: {
    amoy: { url: process.env.POLYGON_TESTNET_RPC||"https://rpc-amoy.polygon.technology", accounts: process.env.WALLET_PRIVATE_KEY?[process.env.WALLET_PRIVATE_KEY]:[] },
    polygon: { url: process.env.POLYGON_RPC_URL||"https://polygon-rpc.com", accounts: process.env.WALLET_PRIVATE_KEY?[process.env.WALLET_PRIVATE_KEY]:[] },
  },
  gasReporter: { enabled: process.env.REPORT_GAS === "true", currency: "USD" },
};
