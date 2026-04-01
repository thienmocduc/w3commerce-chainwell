require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../.env" });
const PK = process.env.WALLET_PRIVATE_KEY || "0x" + "0".repeat(64);
module.exports = {
  solidity: { version: "0.8.24", settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" } },
  paths: { sources: "./wk", tests: "./test", cache: "./cache-wk", artifacts: "./artifacts-wk" },
  networks: {
    amoy:    { url: process.env.POLYGON_TESTNET_RPC || "https://rpc-amoy.polygon.technology", accounts: [PK], chainId: 80002 },
    polygon: { url: process.env.POLYGON_RPC_URL    || "https://polygon-rpc.com",              accounts: [PK], chainId: 137  },
  },
  etherscan: {
    apiKey: { polygonAmoy: process.env.POLYGONSCAN_API_KEY || "", polygon: process.env.POLYGONSCAN_API_KEY || "" },
    customChains: [{ network: "polygonAmoy", chainId: 80002,
      urls: { apiURL: "https://api-amoy.polygonscan.com/api", browserURL: "https://amoy.polygonscan.com" } }],
  },
};
