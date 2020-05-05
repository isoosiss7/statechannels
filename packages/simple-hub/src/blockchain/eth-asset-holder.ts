import AsyncLock from 'async-lock';
import {Contract, ContractFactory, ethers, providers} from 'ethers';
import {BigNumber} from 'ethers/utils';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {cHubChainPK} from '../constants';
import {log} from '../logger';

const rpcEndpoint = process.env.RPC_ENDPOINT;
const provider = new providers.JsonRpcProvider(rpcEndpoint);
const walletWithProvider = new ethers.Wallet(cHubChainPK, provider);
let ethAssetHolder: Contract = null;

const lock = new AsyncLock();

export async function makeDeposits(
  depositsToMake: {
    channelId: string;
    amountToDeposit: BigNumber;
  }[]
) {
  log.info(`makeDeposit: attempting to make ${depositsToMake.length} deposits`);
  await Promise.all(
    depositsToMake.map(depositToMake => {
      log.info(
        `makeDeposit: depositing ${depositToMake.amountToDeposit} to ${depositToMake.channelId}`
      );
      return fund(depositToMake.channelId, depositToMake.amountToDeposit);
    })
  );
  log.info(`makeDepost: making ${depositsToMake.length} deposits`);
}

async function fund(channelID: string, value: BigNumber): Promise<string> {
  // We lock to avoid this issue: https://github.com/ethers-io/ethers.js/issues/363
  // When ethers.js attempts to run multiple transactions around the same time it results in an error
  // due to the nonce getting out of sync.
  // To avoid this we only allow deposit transactions to happen serially.
  return lock.acquire('depositing', async release => {
    if (!ethAssetHolder) ethAssetHolder = await createEthAssetHolder();

    const expectedHeld: BigNumber = await ethAssetHolder.holdings(channelID);
    if (expectedHeld.gte(value)) {
      release();
      return;
    }

    log.info(
      {value: value.sub(expectedHeld).toHexString()},
      'submitting deposit transaction to eth asset holder'
    );
    const tx = await ethAssetHolder.deposit(channelID, expectedHeld.toHexString(), value, {
      value: value.sub(expectedHeld)
    });
    log.info(
    {transaction: {hash: tx.hash, nonce: tx.nonce}},
    'waiting for tx to be mined');
    await tx.wait();

    const holdings = (await ethAssetHolder.holdings(channelID)).toHexString();
    release();
    return holdings;
  });
}

export async function createEthAssetHolder() {
  let ethAssetHolderFactory: ContractFactory;
  try {
    ethAssetHolderFactory = await ContractFactory.fromSolidity(
      ContractArtifacts.EthAssetHolderArtifact,
      walletWithProvider
    );
  } catch (err) {
    if (err.message.match('bytecode must be a valid hex string')) {
      throw new Error(`Contract not deployed on network ${process.env.CHAIN_NETWORK_ID}`);
    }

    throw err;
  }

  const contract = await ethAssetHolderFactory.attach(process.env.ETH_ASSET_HOLDER_ADDRESS);

  return contract;
}
