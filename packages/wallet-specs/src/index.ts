export type AppData = string;
export type Signature = string;
export type Recipient = any;
export interface OutcomeItem {
  destination: string;
  amount: number;
}
export type Outcome = OutcomeItem[];
export type Address = string;
export type PrivateKey = string;

export interface ChannelState {
  participants: Address[];
  turnNumber: number;
  outcome: Outcome;
  appData: AppData;
  channelID: string;
}

export interface SignedState {
  state: ChannelState;
  signatures?: Signature[];
}

export interface Failure {
  value: 'failure';
  context: {
    reason: string;
  };
}

export interface Entry {
  type: '';
}

export { chain } from './chain';
export { store } from './store';
