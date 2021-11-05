const EC = require('elliptic').ec;
const SHA256 = require('crypto-js/sha256');
const ec = new EC('secp256k1');
const { MerkleTree } = require('merkletreejs')

class Wallet{
	constructor(){ /* Generate the wallets. ECDSA settings */
		let key = ec.genKeyPair();
		let privateKey = key.getPrivate('hex');
		let publicKey = key.getPublic('hex');		
		this.signingKey = key;
		this.address = publicKey; /* In a real application, public key should be formatted */
	}
}

class Transaction{
	constructor(from, to, amount){ /* Initialize transactions */
		if(from === null) this.fee = 0; else this.fee = 1;	
		this.amount = amount;
		this.hashTx = '';
		this.signature = '';
		this.to = to.address;
		this.timestamp = new Date();	
		if(from === null){ /* Dealing mining transaction from the blockchain */
			this.from = from;
			this.hashTx = this.calculateHash();
			this.signature = "N/A";
		}else{
			this.from = from.address;
			this.signTransaction(from.signingKey);
		}
	}

	calculateHash(){ /* Tx hash. Simplificated */
		return SHA256(this.from + this.to + this.amount + this.timestamp).toString();	
	}

	signTransaction(signingKey){ /* ECDSA */
	/* Check if the if the sender is using a legit public key */
		if (signingKey.getPublic('hex') !== this.from) 
			throw new Error("You can't sign transations for other wallets");
		this.hashTx = this.calculateHash();
		const signature = signingKey.sign(this.hashTx, 'base64');
		this.signature = signature.toDER('hex');	
	}

	isValid(){ /* Check transaction validity */
		if(this.from === 'null')
			return true;
		if(!this.signature || this.signature.length === 0)
			throw new Error("No signature in this transaction");
		const publicKey = ec.keyFromPublic(this.from,'hex');
		return publicKey.verify(this.calculateHash(), this.signature)
	}
}

class Block{
	constructor(transactions, previousHash, difficulty){ /* Initialize block header */
		this.transactions = transactions;
		this.previousHash = previousHash;
		this.hash = "";
		this.merkle = this.calculateMerkle(transactions);
		this.nonce = 0;
		this.difficulty = difficulty;
		let timestamp_s = new Date();
		this.mineBlock();
		this.timestamp = new Date();
		this.time_to_mine = this.timestamp - timestamp_s;
		this.hashrate = this.nonce/(this.time_to_mine / 1000);
	}

	calculateHash(){ /* Block hash */
		return SHA256(this.previousHash + this.merkle + this.timestamp + this.nonce).toString(); /* Simplificated */
	}

	calculateMerkle(transactions){ /* Generate the Merkle Tree. Returns Merkle root */
		const leaves = []; /* Transactions hash array */
		for(const tx of transactions){
			leaves.push(tx.hashTx);
		}
		const tree = new MerkleTree(leaves, SHA256);
		const root = tree.getRoot().toString('hex');
		return root;
	}
	
	mineBlock(){ /* Mine the block reaching the target */
		while(this.hash.substring(0, this.difficulty) !== Array(this.difficulty + 1).join("0")){ /* Set the target. #difficulty 0s */
			this.nonce++;
			this.hash = this.calculateHash();
		}
	}

	hasValidTransations(){ /* Check every transaction validity */
		for(const tx of this.transactions){
			if(!tx.isValid()) return false;
		}
		return true; /* Simplificated. It should check over Merkle Root */
	}
}

class Blockchain{ /* Initialize the blockchain */
	constructor(generator, miningReward, txEveryBlock, halving,currency){ 
		this.halving = halving;	
		this.txEveryBlock = txEveryBlock; 
		this.miningRewardStart = miningReward;
		this.miningReward = miningReward;
		this.mempool = [ 
			new Transaction(null, generator, this.miningReward)
		];
		this.actualSupply = 0;
		this.chain = [this.createGenesisBlock(2)]; /* Starting difficulty */
		this.mempool = []; /* Transaction to be validated */
		this.maxSupply = this.calculateMaxSupply();
		this.currency = currency;
	}

	calculateMaxSupply(){ /* Evaluate the max supply related to halvings */
		let ret = this.miningReward;
		let val = ret;
		while(ret>0){
			ret = parseInt(ret/2);
			val+=ret;
		}
		return (this.halving*val);
	}

	createGenesisBlock(difficulty){ /* Creating block 0 */
		this.actualSupply = this.miningReward;
		return new Block(this.mempool,'0x0', difficulty);
	}

	getLatestBlock(){
		return this.chain[this.chain.length - 1];
	}
	
	mineMempool(miningRewardWallet,maxdifficulty,mindifficulty){
		/* Mine the mempool and create the block. Reward to the randomly chosen wallet */
		let totalFees = 0;
		for(const tx of this.mempool){ /* Sum fees */
			totalFees += tx.fee;
		}
		this.mempool.push(new Transaction(null, miningRewardWallet, (this.miningReward + totalFees))); /* Add transaction related to the reward for the miner */
		if(this.miningReward>=0) /* Updating actual supply */
			this.actualSupply += this.miningReward;
		let block = new Block(this.mempool, this.getLatestBlock().hash,parseInt(Math.random() * (maxdifficulty - mindifficulty) + mindifficulty)); 
		/* Randomly evaluate the difficulty */
		this.chain.push(block); /* Add new block to the chain */
		if(((this.chain.length)%this.halving) === 0) /* Apply halving */
			this.miningReward = parseInt(this.miningReward/2);
		this.mempool = [];
	}

	addTransaction(transaction){
		if(!transaction.from || !transaction.to){
			throw new Error("Transactions must include from and to address");
		}

		if(!transaction.isValid()){
			throw new Error("Cannot add invalid transactions");
		}

		if(transaction.from != transaction.to){
			if(transaction.amount != 0){
				/* Check every user balance in case of multiple transactions in the mempool */
				let partial = 0; 
				for(const tx of this.mempool){
					if(tx.from === transaction.from){
						partial = partial + tx.amount + tx.fee;
					}
				}			
				if((partial+transaction.amount+transaction.fee) <= this.getBalanceOfAddress(transaction.from)){ /* Fairness check */
					this.mempool.push(transaction);
				}
			}
		}
	}

	getBalanceOfAddress(address){ 
	/* Check the balance of every user. Loop over the transactions in every block. */
		let balance = 0;
		for(const block of this.chain){
			for(const transaction of block.transactions){
				if(transaction.from === address)
					balance -= (transaction.amount + transaction.fee);
				if(transaction.to === address)
					balance += (transaction.amount);
			}
		}
		return balance;
	}

	isChainvalid(){ /* Check chain consisnency */
		for(let i = 1; i < this.chain.length.length; i++){
			const currentBlock = this.chain[i];
			const previousBlock = this.chain[i - 1];
			if(!currentBlock.hasValidTransations()){
				return false;
			}
			if(currentBlock.hash !== currentBlock.calculateHash()){
				return false;
			}
			if(previousBlock.hash !== currentBlock.previousHash){
				return false;
			}
		}
		return true;
	}
}

module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;
module.exports.Wallet = Wallet;



