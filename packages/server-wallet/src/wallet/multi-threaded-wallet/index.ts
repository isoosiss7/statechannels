import {UpdateChannelParams} from '@statechannels/client-api-schema';

import {IncomingServerWalletConfig} from '../../config';
import {MultipleChannelOutput, SingleChannelOutput} from '../types';
import {SingleThreadedWallet} from '../wallet';

import {WorkerManager} from './manager';

/**
 * A multi-threaded Nitro wallet
 */
export class MultiThreadedWallet extends SingleThreadedWallet {
  private workerManager: WorkerManager;

  public static async create(
    walletConfig: IncomingServerWalletConfig
  ): Promise<MultiThreadedWallet> {
    return new this(walletConfig);
  }

  protected constructor(walletConfig: IncomingServerWalletConfig) {
    super(walletConfig);
    this.workerManager = new WorkerManager(this.walletConfig);
  }

  async updateChannel(args: UpdateChannelParams): Promise<SingleChannelOutput> {
    return this.workerManager.updateChannel(args);
  }

  async pushMessage(rawPayload: unknown): Promise<MultipleChannelOutput> {
    return this.workerManager.pushMessage(rawPayload);
  }

  async pushUpdate(rawPayload: unknown): Promise<SingleChannelOutput> {
    return this.workerManager.pushUpdate(rawPayload);
  }

  public async destroy(): Promise<void> {
    await this.workerManager.destroy();
    await super.destroy();
  }

  public async warmUpThreads(): Promise<void> {
    return this.workerManager.warmUpThreads();
  }
}
