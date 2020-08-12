---
id: version-0.2.0-iframe-channel-provider.iframechannelprovider.enable
title: IFrameChannelProvider.enable() method
hide_title: true
original_id: iframe-channel-provider.iframechannelprovider.enable
---
<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[@statechannels/iframe-channel-provider](./iframe-channel-provider.md) &gt; [IFrameChannelProvider](./iframe-channel-provider.iframechannelprovider.md) &gt; [enable](./iframe-channel-provider.iframechannelprovider.enable.md)

## IFrameChannelProvider.enable() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Enable the channel provider

<b>Signature:</b>

```typescript
enable(): Promise<void>;
```
<b>Returns:</b>

Promise&lt;void&gt;

Promise which resolves when the wallet has completed the Enable Ethereum workflow.

## Remarks

This causes the provider to cache [signingAddress](./iframe-channel-provider.iframechannelprovider.signingaddress.md)<!-- -->, [destinationAddress](./iframe-channel-provider.iframechannelprovider.destinationaddress.md) and [walletVersion](./iframe-channel-provider.iframechannelprovider.walletversion.md) from the wallet.