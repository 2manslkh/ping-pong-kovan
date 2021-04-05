const axios = require("axios").default;
let fs = require("fs");

// Initialize web3
let Web3 = require("web3");
if (typeof web3 !== "undefined") {
  web3 = new Web3(web3.currentProvider);
} else {
  // Connect to the kovan network using the infura provider
  web3 = new Web3(
    new Web3.providers.WebsocketProvider(
      "wss://kovan.infura.io/ws/v3/fea43923cc6e4e449d156724c716762b", // Infura Kovan Provider
      {
        clientOptions: {
          maxReceivedFrameSize: 100000000,
          maxReceivedMessageSize: 100000000,
        },
      }
      // "ws://127.0.0.1:7545" // Local Node
    )
  );
}

// Transaction Hash of Deployed PingPong Contract
const localContractAddress = "0xac0e262dFa2e021cE53efF817B5c98020EaE1533";
// alt: 0x17811bf72B1974Ea483391878EFF0AB99110B6C6
// main: 0x481D2f0994785a3f350CC678d225A0cB2857E883
const kovanContractAddress = "0x481D2f0994785a3f350CC678d225A0cB2857E883";

// Addresses of Deployed PingPong Contract
// alt: 0x0e9fa76fcc1f4e72cd87d8ab4ce842049683efa8e8b43c0cf0a552787551339a
// main: 0xc326cba0dc99ced625c14b50586382f881685563b3227632a76aa754d2568af5
const kovanContractTH =
  "0xc326cba0dc99ced625c14b50586382f881685563b3227632a76aa754d2568af5";
const localContractTH =
  "0x6234CA8965a74f4b6f08D83820B34A9a6d66A92Dd1fBC04f82B176f38722718b";

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

const Pong = async (contract, pingTxnHash, account, nonce) => {
  try {
    const gasPrice = await web3.eth.getGasPrice();
    console.log("Nonce: " + nonce);

    const tx = contract.methods.pong(pingTxnHash);
    await tx
      .send({
        from: account,
        nonce: nonce,
        gasPrice: gasPrice,
        gas: (await tx.estimateGas()) * 10,
      })
      .then((result) => {
        console.log(result);
        return nonce;
      });
    return nonce;
  } catch (e) {
    console.log(e);
    Pong(contract, pingTxnHash, account, nonce + 1);
    return nonce;
  }
};

const getStartBlock = async (txnHash) => {
  const blockNumber = await web3.eth
    .getTransactionReceipt(txnHash)
    .then((result) => {
      console.log(result);
      return result.blockNumber;
    });
  return blockNumber;
};

const getPastEvents = async (
  contract,
  eventName,
  fromBlock,
  toBlock,
  filter
) => {
  try {
    const pastEvents = await contract
      .getPastEvents(
        eventName,
        { fromBlock: fromBlock, toBlock: toBlock },
        (error, events) => events
      )
      .then((result) => result);
    // console.log(pastEvents);
    return pastEvents;
  } catch (e) {
    console.log(e);
  }
};

const getContract = async () => {
  const network = await getNetworkType();
  let contractAddress;

  console.log(network + " Detected");
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
    .then((contractABIJSON) => JSON.parse(contractABIJSON.data.result))
    .catch((e) => console.log("Wow. Something went wrong: " + e));

  // console.log(contractABI);

  const PingPongContract = new web3.eth.Contract(contractABI, contractAddress);
  return PingPongContract;
};

const getContractTH = async () => {
  const network = await getNetworkType();
  let contractTH;

  console.log(network + " Detected");
  if (network == "kovan") {
    contractTH = kovanContractTH;
  } else {
    contractTH = localContractTH;
  }

  return contractTH;
};

const saveBlockNumber = (endBlockWindow) => {
  // Record endBlockWindow into local file
  fs.writeFile("endblock.txt", endBlockWindow, function (err) {
    if (err) throw err;
    console.log("Saved!");
  });
};

// Main Function
(async () => {
  // Get Account
  let account = await getAccount();

  // Get Contract based on current network
  let contract = await getContract();
  // console.log(contract);

  // Get Contract Deployment transaction hash
  let contractTH = await getContractTH();

  // Set Block Interval
  const blockInterval = 1000;

  // Get Block Number of Contract
  let startBlockWindow;
  let endBlockWindow;
  let startBlock;
  // Check if endblock.txt file exists, if it does, load the value and assign it to startBlock

  // try {
  //   fs.readFile("endblock.txt", function (err, data) {
  //     if (err) throw err;
  //     startBlock = parseInt(data);
  //     startBlockWindow = startBlock;
  //     endBlockWindow = startBlock + blockInterval;
  //   });
  // } catch (err) {}

  if (fs.existsSync("endblock.txt")) {
    // Do something
    fs.readFile("endblock.txt", function (err, data) {
      if (err) throw err;
      startBlock = parseInt(data);
      startBlockWindow = startBlock;
      endBlockWindow = startBlock + blockInterval;
    });
  } else {
    startBlock = await getStartBlock(contractTH).then((startBlock) => {
      fs.writeFile("endblock.txt", startBlock, async function (err) {
        if (err) throw err;
        console.log("Saved!");
        startBlockWindow = startBlock;
        endBlockWindow = startBlock + blockInterval;
      });
    });
  }

  // Get latest block
  let latestBlock = await web3.eth.getBlockNumber();

  console.log("Start Block Window: " + startBlockWindow);
  console.log("End Block Window: " + endBlockWindow);
  console.log("Latest Block: " + latestBlock);

  // Initialize start nonce
  let nonce = await web3.eth.getTransactionCount(account);

  // Initialize Ping Dictionary: PingTxnHash : BlockNumber
  let pingDict = {};

  // Initialize unPonged Ping counter
  let unpingedCount = 0;

  // Initialize ping Set
  let pingSet = new Set();

  // Get Past Events of Blocks within a range (sync)
  while (startBlockWindow < latestBlock) {
    console.log("Start Block Window: " + startBlockWindow);
    console.log("End Block Window: " + endBlockWindow);
    console.log("Latest Block: " + latestBlock);

    let pastEvents = await getPastEvents(
      contract,
      ["Ping", "Pong"],
      startBlockWindow,
      endBlockWindow,
      ""
    );

    // console.log(pastEvents);

    // If Ping is found, add its TxnHash to the set,
    // If Pong is found, remove associated Ping with the same Txn hash
    for (let i = 0; i < pastEvents.length; i++) {
      if (pastEvents[i].event == "Ping") {
        pingSet.add(pastEvents[i].transactionHash);
        pingDict[pastEvents[i].transactionHash] = pastEvents[i].blockNumber;
      } else if (pastEvents[i].event == "Pong") {
        pingSet.delete(pastEvents[i].returnValues.txHash);
      }
    }

    // console.log(pingDict);

    // Move Block Window
    startBlockWindow += blockInterval;
    endBlockWindow += blockInterval;

    if (endBlockWindow > latestBlock) endBlockWindow = latestBlock;
  }

  // Print pingSet
  console.log(pingSet);

  // Update unping Count
  unpingedCount += pingSet.size;
  console.log("Total Unponged Pings: " + unpingedCount);

  // Convert Set to Array for iteration
  let pingArray = Array.from(pingSet);

  // Pong all un-ponged pings in the Ping Set

  for (let j = 0; j < pingArray.length; j++) {
    nonce = await Pong(contract, pingArray[j], account, nonce);
    nonce = nonce + 1;
    saveBlockNumber(pingDict[pingArray[j]]);
    unpingedCount -= 1;
    console.log("Pings Left: " + unpingedCount);
  }

  // Sync End

  latestBlock = await web3.eth.getBlockNumber();
  saveBlockNumber(latestBlock);
  // Realtime update
  console.log("All Pings before " + latestBlock + "have been Ponged.");
  console.log("Listening for new Pings...");
  contract.events
    .Ping({ fromBlock: latestBlock }, (event) => console.log(event))
    .on("data", async (event) => {
      let txnHash = event.transactionHash;
      let nonce = await web3.eth.getTransactionCount(account);
      let result = await Pong(contract, txnHash, account, nonce);
      console.log(result);
      saveBlockNumber(event.blockNumber);
    });
})();

// Get transaction receipt of PingPong Contract

// console.log(_startblock);
// In batches, look for transactions where Ping() and Pong() are called

// For each Ping(), store the transaction hash, in a SET

// For each Pong(), remove the transaction hash from the SET

// Write the Block Number to local storage (.txt)

// Do Until current block

// From Current Block, listen for Ping() Event

// When Ping() Event Occurs, Record Transaction Number _txnNo

// Call Pong(_txnNo)

// Write Block Number to local storage (.txt)
