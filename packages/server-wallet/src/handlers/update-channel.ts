import {Either, left, right, chain, map} from 'fp-ts/lib/Either';
import {SignedStateWithHash, StateVariables, Outcome} from '@statechannels/wallet-core';
import {pipe} from 'fp-ts/lib/function';
import {ChannelId} from '@statechannels/client-api-schema';

import {SignState, signState} from '../protocols/actions';
import {ChannelState} from '../protocols/state';

type ChannelStateWithSupported = ChannelState & {
  supported: SignedStateWithHash;
  latestSignedByMe: SignedStateWithHash;
};

type StepResult = Either<UpdateChannelError, ChannelStateWithSupported>;
type UpdateChannelResult = Either<UpdateChannelError, SignState>;
export interface UpdateChannelHandlerParams {
  channelId: ChannelId;
  outcome: Outcome;
  appData: string;
}

export enum UpdateChannelErrors {
  invalidLatestState = 'must have latest state',
  notInRunningStage = 'channel must be in running state',
  notMyTurn = 'it is not my turn',
  channelNotFound = 'channel not found',
}

export class UpdateChannelError extends Error {
  readonly type = 'UpdateChannelError';
  constructor(reason: UpdateChannelErrors, public readonly data: any = undefined) {
    super(reason);
  }
}

const hasSupportedState = (cs: ChannelState): cs is ChannelStateWithSupported => !!cs.supported;

// The helper functions should be factored out, tested, and reusable
const ensureSupportedStateExists = (
  cs: ChannelState
): Either<UpdateChannelError, ChannelStateWithSupported> =>
  hasSupportedState(cs)
    ? right(cs)
    : left(new UpdateChannelError(UpdateChannelErrors.invalidLatestState));

function isMyTurn(cs: ChannelStateWithSupported): StepResult {
  if ((cs.supported.turnNum + 1) % cs.supported.participants.length === cs.myIndex)
    return right(cs);
  return left(new UpdateChannelError(UpdateChannelErrors.notMyTurn));
}

function hasRunningTurnNumber(cs: ChannelStateWithSupported): StepResult {
  if (cs.supported.turnNum < 3)
    return left(new UpdateChannelError(UpdateChannelErrors.notInRunningStage));
  return right(cs);
}

const incrementTurnNumber = (args: UpdateChannelHandlerParams) => (
  cs: ChannelStateWithSupported
): StateVariables => ({
  ...args,
  turnNum: cs.supported.turnNum + 1,
  isFinal: false,
});
// END helper functions

// todo: check if the channel is funded and that no challenge exists once that data is part of the ChannelState
export function updateChannel(
  args: UpdateChannelHandlerParams,
  channelState: ChannelState
): UpdateChannelResult {
  const signStateVars = (sv: StateVariables): SignState =>
    signState({...sv, channelId: args.channelId});

  return pipe(
    channelState,
    ensureSupportedStateExists,
    chain(hasRunningTurnNumber),
    chain(isMyTurn),
    map(incrementTurnNumber(args)),
    map(signStateVars)
  );
}
