import { getContract } from "viem";
import { billboardAbi, billboardRegistryAbi } from "./abi";
import { publicClient, walletClient, account } from "./client";

// number of auctions to be cleared at once
const BATCH_SIZE = 10;

const billboardContract = {
  address: process.env.BILLBOARD_CONTRACT_ADDRESS as `0x${string}`,
  abi: billboardAbi,
  account,
} as const;

const billboardRegsitryContract = {
  address: process.env.BILLBOARD_REGISTRY_CONTRACT_ADDRESS as `0x${string}`,
  abi: billboardRegistryAbi,
} as const;

export const clearAuctions = async () => {
  // get auctions to be cleared
  const lastTokenId = await publicClient.readContract({
    ...billboardRegsitryContract,
    functionName: "lastTokenId",
  });
  const auctionIdsResults = await publicClient.multicall({
    contracts: Array.from({ length: Number(lastTokenId) }, (_, i) => ({
      ...billboardRegsitryContract,
      functionName: "nextBoardAuctionId",
      args: [BigInt(i + 1)],
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
    return;
  }

  const autionsResults = await publicClient.multicall({
    contracts: auctionIds.map(({ tokenId, auctionId }) => ({
      ...billboardRegsitryContract,
      functionName: "getAuction",
      args: [tokenId, auctionId],
    })),
  });

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

      const now = Date.now();

      console.log(result);

      // already ended
      if (Number(result.endAt) * 1000 > now) {
        return false;
      }

      // already leased
      if (result.leaseEndAt) {
        return false;
      }

      return true;
    })
    .map(({ tokenId, auctionId }) => ({ tokenId, auctionId }))
    .slice(0, BATCH_SIZE);

  console.log("auctionIds to clear: ", auctions);

  // clear auctions
  await walletClient.writeContract({
    ...billboardContract,
    functionName: "clearAuctions",
    args: [auctions.map(({ tokenId }) => tokenId)],
  });
};
