import { billboardAbi, billboardRegistryAbi } from "./abi";
import { publicClient, account } from "./client";

// number of auctions to be cleared at once
const BATCH_SIZE = 2;

export const billboardContract = {
  address: process.env.BILLBOARD_CONTRACT_ADDRESS as `0x${string}`,
  abi: billboardAbi,
  account,
} as const;

export const billboardRegsitryContract = {
  address: process.env.BILLBOARD_REGISTRY_CONTRACT_ADDRESS as `0x${string}`,
  abi: billboardRegistryAbi,
} as const;

type Auction = { tokenId: bigint; auctionId: bigint };

export const getClearableAuctions = async ({
  from,
  to,
}: {
  // token id range to check
  from: number;
  to: number;
}): Promise<Auction[]> => {
  // get auctions to be cleared
  const auctionIdsResults = await publicClient.multicall({
    contracts: Array.from({ length: to - from + 1 }, (_, i) => ({
      ...billboardRegsitryContract,
      functionName: "nextBoardAuctionId",
      args: [BigInt(i + from)],
    })),
  });

  const auctionIds: Array<{ tokenId: bigint; auctionId: bigint }> =
    auctionIdsResults
      .filter(({ result }) => !!result && result > 0)
      .map(({ result }, i) => ({
        tokenId: BigInt(i + 1),
        auctionId: result!,
      }));

  console.log("auctionIds to check: ", auctionIds);

  if (auctionIds.length <= 0) {
    return [];
  }

  const autionsResults = await publicClient.multicall({
    contracts: auctionIds.map(({ tokenId, auctionId }) => ({
      ...billboardRegsitryContract,
      functionName: "getAuction",
      args: [tokenId, auctionId],
    })),
  });

  const blockNow = await publicClient.getBlockNumber();
  const auctions = autionsResults
    .map(({ result }, i) => ({
      tokenId: auctionIds[i].tokenId,
      auctionId: auctionIds[i].auctionId,
      result,
    }))
    .filter(({ result }) => {
      if (!result) {
        return false;
      }

      // already ended
      if (result.endAt > blockNow) {
        return false;
      }

      // already cleared
      if (result.leaseEndAt) {
        return false;
      }

      return true;
    })
    .map(({ tokenId, auctionId }) => ({ tokenId, auctionId }))
    .slice(0, BATCH_SIZE);

  console.log("auctionIds to clear: ", auctions);

  return auctions;
};
