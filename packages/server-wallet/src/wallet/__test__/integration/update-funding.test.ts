import {BN, makeAddress} from '@statechannels/wallet-core';
import {ethers, constants} from 'ethers';

import {channel} from '../../../models/__test__/fixtures/channel';
import {stateWithHashSignedBy} from '../fixtures/states';
import {Channel} from '../../../models/channel';
import {Wallet} from '../..';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {alice, bob} from '../fixtures/signing-wallets';
import {Funding} from '../../../models/funding';
import {ObjectiveModel} from '../../../models/objective';
import {DBAdmin} from '../../../db-admin/db-admin';
import {getChannelResultFor, getSignedStateFor} from '../../../__test__/test-helpers';
import {defaultTestConfig} from '../../../config';

const AddressZero = makeAddress(ethers.constants.AddressZero);

let w: Wallet;
beforeEach(async () => {
  w = await Wallet.create(defaultTestConfig());
  await DBAdmin.truncateDataBaseFromKnex(w.knex);
});
afterEach(async () => {
  await w.destroy();
});

beforeEach(async () => await seedAlicesSigningWallet(w.knex));

it('sends the post fund setup when the funding event is provided for multiple channels', async () => {
  const c1 = channel({
    channelNonce: 1,
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 0, channelNonce: 1})],
  });
  const c2 = channel({
    channelNonce: 2,
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 0, channelNonce: 2})],
  });
  await Channel.query(w.knex).insert(c1);
  await Channel.query(w.knex).insert(c2);
  const channelIds = [c1, c2].map(c => c.channelId);

  await ObjectiveModel.insert(
    {
      type: 'OpenChannel',
      participants: c1.participants,
      data: {
        targetChannelId: c1.channelId,
        fundingStrategy: 'Direct',
        role: 'app',
      },
      status: 'approved',
    },
    w.knex
  );

  await ObjectiveModel.insert(
    {
      type: 'OpenChannel',
      participants: c2.participants,
      data: {
        targetChannelId: c2.channelId,
        fundingStrategy: 'Direct',
        role: 'app',
      },
      status: 'approved',
    },
    w.knex
  );

  const {outbox, channelResults} = await w.updateFundingForChannels(
    channelIds.map(cId => ({
      channelId: cId,
      assetHolderAddress: makeAddress(constants.AddressZero),
      amount: BN.from(4),
    }))
  );

  await expect(Funding.getFundingAmount(w.knex, c1.channelId, AddressZero)).resolves.toEqual(
    '0x04'
  );

  await expect(Funding.getFundingAmount(w.knex, c2.channelId, AddressZero)).resolves.toEqual(
    '0x04'
  );

  expect(getChannelResultFor(channelIds[0], channelResults)).toMatchObject({
    turnNum: 0, // 3 not supported, so channelResult still has turnNum 0
  });

  expect(getChannelResultFor(channelIds[1], channelResults)).toMatchObject({
    turnNum: 0, // 3 not supported, so channelResult still has turnNum 0
  });

  expect(getSignedStateFor(channelIds[0], outbox)).toMatchObject({
    turnNum: 3,
    channelNonce: 1,
  });

  expect(getSignedStateFor(channelIds[1], outbox)).toMatchObject({
    turnNum: 3,
    channelNonce: 2,
  });
});

it('sends the post fund setup when the funding event is provided', async () => {
  const c = channel({
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 0})],
  });
  await Channel.query(w.knex).insert(c);
  const {channelId} = c;

  await ObjectiveModel.insert(
    {
      type: 'OpenChannel',
      participants: c.participants,
      data: {
        targetChannelId: c.channelId,
        fundingStrategy: 'Direct',
        role: 'app',
      },
      status: 'approved',
    },
    w.knex
  );

  const result = await w.updateFundingForChannels([
    {
      channelId: c.channelId,
      assetHolderAddress: makeAddress(constants.AddressZero),
      amount: BN.from(4),
    },
  ]);

  await expect(Funding.getFundingAmount(w.knex, channelId, AddressZero)).resolves.toEqual('0x04');

  expect(result).toMatchObject({
    outbox: [
      {
        params: {
          recipient: 'bob',
          sender: 'alice',
          data: {signedStates: [{turnNum: 3}]},
        },
      },
    ],
    channelResults: [{channelId: c.channelId, turnNum: 0}],
  });
});

it('emits new channel result when the funding event is provided via holdingUpdated', async () => {
  const c = channel({
    vars: [stateWithHashSignedBy([alice(), bob()])({turnNum: 0})],
  });
  await Channel.query(w.knex).insert(c);
  const {channelId} = c;

  await ObjectiveModel.insert(
    {
      type: 'OpenChannel',
      participants: c.participants,
      data: {
        targetChannelId: c.channelId,
        fundingStrategy: 'Direct',
        role: 'app',
      },
      status: 'approved',
    },
    w.knex
  );

  const channelUpdatedPromise = new Promise(resolve =>
    w.on('channelUpdated', ({channelResult}) =>
      channelResult.channelId === channelId ? resolve(channelResult) : undefined
    )
  );

  await w.holdingUpdated({
    channelId: c.channelId,
    assetHolderAddress: makeAddress(constants.AddressZero),
    amount: BN.from(4),
  });

  const channelResult = await channelUpdatedPromise;

  await expect(Funding.getFundingAmount(w.knex, channelId, AddressZero)).resolves.toEqual('0x04');

  expect(channelResult).toMatchObject({channelId: c.channelId, turnNum: 0});
});
