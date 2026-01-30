import { task } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-verify";
import "hardhat-contract-sizer";
import "hardhat-abi-exporter";
import "hardhat-gas-reporter";
import * as dotenv from "dotenv";
import "hardhat-deploy";
import "hardhat-deploy-ethers";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const { TESTNET_PRIVATE_KEY: testnetPrivateKey } = process.env;
const reportGas = process.env.REPORT_GAS;

// Validate private key - must be 64 hex characters (32 bytes)
const isValidPrivateKey =
  testnetPrivateKey && testnetPrivateKey.length === 64 && /^[0-9a-fA-F]+$/.test(testnetPrivateKey);

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
      timeout: 40000,
    },
    sepolia: {
      url: "https://ethereum-sepolia-rpc.publicnode.com", // Free public RPC
      chainId: 11155111,
      accounts: isValidPrivateKey ? [testnetPrivateKey] : [],
      timeout: 40000,
      gasPrice: "auto",
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          },
          viaIR: true,
        },
      },
    ],
  },
  abiExporter: {
    path: "data/abi",
    runOnCompile: true,
    clear: true,
    flat: false,
    only: [],
    spacing: 4,
  },
  gasReporter: {
    enabled: reportGas == "1",
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: false,
  },
  mocha: {
    timeout: 40000,
  },
  namedAccounts: {
    deployer: 0,
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v6",
  },
};
