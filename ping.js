const axios = require("axios").default;

// Initialize web3
let Web3 = require("web3");
if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  // Connect to the kovan network using the infura provider
  web3 = new Web3(
    new Web3.providers.HttpProvider(
      "https://kovan.infura.io/v3/fea43923cc6e4e449d156724c716762b" // Infura Kovan Provider
      // "HTTP://127.0.0.1:7545" // Local Node
    )
  );
}

// kovan 0x17811bf72B1974Ea483391878EFF0AB99110B6C6
// local: 0xEa8D6c378fF3Cf7D47c3Fb5b457bBA67fDB73d89
const kovanContractAddress = "0x17811bf72B1974Ea483391878EFF0AB99110B6C6";
const localContractAddress = "0xac0e262dFa2e021cE53efF817B5c98020EaE1533";

const getNetworkType = async () => {
  return web3.eth.net
    .isListening()
    .then(() => web3.eth.net.getNetworkType())
    .catch((e) => console.log("Wow. Something went wrong: " + e));
};

const getAccount = async () => {
  const network = await getNetworkType();
  let account;
  console.log(network + " Detected");
  if (network == "kovan") {
    let privateKey =
      "0x1af58a5cd821b616a0f273259f92fa7525c5346d2942a3b610cc6a2721f36f24";
    web3.eth.accounts.wallet.add(privateKey);
    account = web3.eth.accounts.wallet[0].address;
  } else {
    const accounts = await web3.eth.getAccounts();
    account = accounts[0];
  }
  // Show Accounts
  web3.eth.getAccounts(console.log);
  return account;
};

const getContract = async () => {
  const network = await getNetworkType();
  let contractAddress;

  if (network == "kovan") {
    contractAddress = kovanContractAddress;
  } else {
    contractAddress = localContractAddress;
  }

  console.log("Contract Address: " + contractAddress);

  const contractABI = await axios
    .get(
      "https://api-kovan.etherscan.io/api?module=contract&action=getabi&address=0x481d2f0994785a3f350cc678d225a0cb2857e883&apikey=MEHN73WIPSDJPJ8CPKG3ATX84QT3XBGJCW"
    )
    .then((contractABIJSON) => {
      // console.log(contractABIJSON);
      return JSON.parse(contractABIJSON.data.result);
    })
    .catch((e) => console.log("Wow. Something went wrong: " + e));

  // console.log(contractABI);

  const PingPongContract = new web3.eth.Contract(contractABI, contractAddress);
  return PingPongContract;
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const Ping = async (contract, account) => {
  try {
    console.log("Estimating Gas");
    const gasPrice = await web3.eth.getGasPrice();

    const tx = contract.methods.ping();
    const receipt = await tx.send({
      from: account,
      gasPrice: gasPrice,
      gas: (await tx.estimateGas()) * 10,
    });

    return receipt;
  } catch (e) {
    console.log("ERROR: " + e);
    console.log("Retrying Ping...");
    // Pong(contract, pingTxnHash, account, nonce + 1);
  }
};

(async () => {
  // Get Account
  let account = await getAccount();

  // Get Contract based on current network
  let contract = await getContract();

  while (true) {
    let delayTime = 5000;
    console.log("Waiting " + String(delayTime) + "ms");
    await delay(delayTime);
    await Ping(contract, account);
  }
})();
