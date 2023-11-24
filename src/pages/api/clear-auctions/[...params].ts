import { clearAuctions } from "@/utils";
import { NextApiRequest, NextApiResponse } from "next";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (
    process.env.RUNTIME !== "local" &&
    req.headers["Authorization"] !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ success: false, error: "unauthorized" });
  }

  const { params } = req.query as { params: string[] };
  const from = Number(params[0]) || 0;
  const to = Number(params[1]) || 0;

  if (from <= 0 || to <= 0 || from >= to) {
    return res.status(400).json({ success: false, error: "invalid params" });
  }

  try {
    await clearAuctions({ from, to });

    return res.status(200).json({ success: true, now: Date.now() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "server error" });
  }
};

export default handler;
