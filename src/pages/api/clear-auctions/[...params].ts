import {
  billboardContract,
  getClearableAuctions,
  publicClient,
  walletClient,
} from "@/utils";
import { NextApiRequest, NextApiResponse } from "next";
import { SimulateContractErrorType } from "viem";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // if (
  //   process.env.RUNTIME !== "local" &&
  //   req.headers["Authorization"] !== `Bearer ${process.env.CRON_SECRET}`
  // ) {
  //   return res.status(401).json({ success: false, error: "unauthorized" });
  // }

  const { params } = req.query as { params: string[] };
  const from = Number(params[0]) || 0;
  const to = Number(params[1]) || 0;

  if (from <= 0 || to <= 0 || from >= to) {
    return res.status(400).json({ success: false, error: "invalid params" });
  }

  try {
    // get auctions to be cleared
    const auctions = await getClearableAuctions({ from, to });

    if (!auctions || auctions.length <= 0) {
      return;
    }

    // Step 1: Get total tax of next auction
    let clearAuctionRequest: any;
    let totalTax: BigInt;
    try {
      const result = await publicClient.simulateContract({
        ...billboardContract,
        functionName: "clearAuctions",
        args: [auctions.map(({ tokenId }) => tokenId)],
      });
      clearAuctionRequest = result.request;
      totalTax = result.result[1].reduce((acc, cur) => acc + cur, BigInt(0));
    } catch (err) {
      const error = err as SimulateContractErrorType;
      console.error(error.name, err);

      // if (err instanceof BaseError) {
      //   const revertError = err.walk(
      //     (err) => err instanceof ContractFunctionRevertedError,
      //   );
      //   if (revertError instanceof ContractFunctionRevertedError) {
      //     const errorName = revertError.data?.errorName ?? "";
      //     console.error(errorName, err);
      //   }
      // }
      throw err;
    }

    // Step 2: Get merkle root

    // Step 3: Multicall to
    //   1. clear auction
    //   2. withdraw tax
    //   2. create new drop with merkle root and tax
    await publicClient.multicall({
      contracts: [
        clearAuctionRequest,
        // 2
        // 3
      ],
    });
    // await walletClient.writeContract(request);

    return res.status(200).json({ success: true, now: Date.now() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "server error" });
  }
};

export default handler;
