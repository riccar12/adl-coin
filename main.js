const {Blockchain, Transaction, Wallet} = require('./blockchain');

const currency = "ADL|COIN";
var community = 10; /* Initial community */
var newUsers = 2; /* New users entering the network; exponential growth */
const newUsersEveryBlock = 30; /* New users insertion every n blocks */
const txEveryBlock = 100; /* Transaction limit in every block */
let miningRewardStart = 20; /* Starting mining reward */
const halving = 100; /* Halving every n blocks */
const debug = false; /* Value which introduce waiting time during the execution */
const maxdifficulty = 5; /* Maximum mining difficulty */
const mindifficulty = 2; /* Minimum mining difficulty */

const users = []; /* Users: array of wallets */
for(let i = 0; i < community; i++) users.push(new Wallet()); /* Genereating the wallets */ 

console.log("Creating the Blockchain\n");
wait(1000,true,debug); /* Introduce waiting time if debug eq. true */
let ADL_Coin = new Blockchain(users[0],miningRewardStart,txEveryBlock, halving,currency); /* New Blockchain instance */

/* Print infos to the bash */
console.log("\nBlockchain created!\n\n");
console.log("Mining reward is set to: " + ADL_Coin.miningReward + " "+ ADL_Coin.currency+"\nFees are fixed to 1 "+ ADL_Coin.currency+"\nHalving is set every "+halving+" blocks. \nCoins cap is set to "+ADL_Coin.maxSupply+" "+ADL_Coin.currency+"\n");
console.log("\nMining difficulty randomly chosen between %d and %d \n",maxdifficulty,mindifficulty);
console.log("Mempool is actually empty.\n");
console.log("Mining Reward set to: %d %s\n",ADL_Coin.miningReward,ADL_Coin.currency);
console.log("\nThe Creator is mining the first block\n");
wait(2000,true,debug);
console.log("\nBlock # " + 0 + " mined!");
console.log("It contains %d transaction and it is the reward for The Creator\n____________________________________________\n",1);
console.log(JSON.stringify(ADL_Coin.chain[0].transactions[0],null,4));
console.log("\nBlockchain infos\n____________________________________________\n");
console.log('\x1b[36m%s\x1b[0m',JSON.stringify(ADL_Coin.chain,['previousHash','hash','nonce','difficulty','timestamp','time_to_mine','hashrate','merkle'],4));
console.log("\nCommunity is actually composed by ", community, " users ");
console.log("	New users every",newUsersEveryBlock," blocks. Follows actual wallets on the net.\n____________________________________________\n");
for(let user of users) 
	console.log('\x1b[36m%s\x1b[0m',JSON.stringify(user,['address']));

/* Execution never stops. 
Using the commented condition the exec will stop when the reward are eq. 0 due to halvings  */
while(1){//ADL_Coin.miningReward>0)
	if(ADL_Coin.actualSupply >= ADL_Coin.maxSupply) {
		console.log("Blockchain reached the maximum supply of %d %s. It will cointinue with only transactions fees as reward for the miners.",ADL_Coin.maxSupply,ADL_Coin.currency);
	}
	if(ADL_Coin.chain.length%newUsersEveryBlock === 0) { /* New users addition */
		for(let j = 0; j < newUsers; j++){
			users.push(new Wallet());
			community++;
		}
		console.log("	",newUsers, " new users enter the net. Community is actually composed by ", community, " users. Follow new wallets on the net.\n____________________________________________\n");
		for(let w = (community-1); w >= (community-newUsers); w--)
			console.log('\x1b[36m%s\x1b[0m',JSON.stringify(users[w],['address']));
		wait(1000,true, debug);
		newUsers++;
	}
	let txN = parseInt(Math.random() * (ADL_Coin.txEveryBlock - 1) + 1); /* Randomly generate the transactions number */
	for(let i = 0; i < txN; i++){ /* Transaction generation */
		let userFrom = parseInt(Math.random() * (community - 0) + 0); /* Randomly pair users involved in the transaction */
		let userTo = parseInt(Math.random() * (community - 0) + 0);
		let amountAvailable = ADL_Coin.getBalanceOfAddress(users[userFrom].address); /* Check the balance and randomly generate the transaction amount */
		ADL_Coin.addTransaction(new Transaction(users[userFrom],users[userTo],parseInt(Math.random() * (amountAvailable - 0) + 0))); 
	}
	console.log("\nCommunity added " + txN + " transactions to the mempool");
	console.log("\nThe mempool has accepted " + ADL_Coin.mempool.length + " transactions.");
	txN = ADL_Coin.mempool.length; /* Value updated considering only valid transactions */

	if(((ADL_Coin.chain.length)%ADL_Coin.halving) === 0) console.log('\x1b[44m\nHalving done.\x1b[0m'); /* Halving */
	if(ADL_Coin.miningReward>0) 
		console.log("\nMining Reward set to: %d %s\n",ADL_Coin.miningReward,ADL_Coin.currency); 
	else 
		console.log("\n\x1b[41mMining reward not available. System in only-fees-mode\x1b[0m\n");
	
	console.log("\nSomeone is going to mine a new block\n");
	ADL_Coin.mineMempool(users[parseInt(Math.random() * (community - 0) + 0)],maxdifficulty,mindifficulty); /* Mining a new block. Miner randomly chosen */
	wait(1000,true,debug);
	console.log("\nBlock # " + (ADL_Coin.chain.length-1) + " mined! ");
	console.log("\nThe Merkle Tree of the block is:");
	console.log('\x1b[35m%s\x1b[0m',(ADL_Coin.getLatestBlock()).merkle);
	
	if(ADL_Coin.miningReward>0) 
		console.log("It contains %d transaction +1 from the system (+fees) to the miner.\n",txN); 
	else  
		console.log("It contains %d transaction +1 which are the actual fees as miner reward.\n",txN);
	console.log("\nTransactions are\n____________________________________________\n");
	console.log(JSON.stringify((ADL_Coin.getLatestBlock()).transactions,null,4));
	console.log("\nBlockchain infos\n____________________________________________\n"); /* Print whole chain */
	console.log('\x1b[36m%s\x1b[0m',JSON.stringify(ADL_Coin.chain,['previousHash','hash','nonce','difficulty','timestamp','time_to_mine','hashrate','merkle'],4));
	console.log("\nChecking balance of every user of the community (%d)",community);
	for(let user of users){
		console.log(JSON.stringify({address: user.address, balance: ADL_Coin.getBalanceOfAddress(user.address)}));
	}
	wait(2000,true,debug);
	console.log("\n\n\n");	
}

/* Service function */
function wait(ms,print,d){
	if(d){
		let exit = (new Date()).getTime() + ms;

		let last_print = new Date().getTime();

		while((new Date().getTime()) < exit){
			if(print&&(((new Date().getTime()) - last_print)>(ms/50))){
				process.stdout.write(".");
				last_print = new Date().getTime();
			}
		}
	}
}