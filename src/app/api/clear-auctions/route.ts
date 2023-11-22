import { clearAuctions } from "@/utils";
import type { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  if (
    process.env.RUNTIME !== "local" &&
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  try {
    await clearAuctions();

    return new Response(JSON.stringify({ success: true, now: Date.now() }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "max-age=0, s-maxage=0",
      },
    });
  } catch (error) {
    console.error(error);
    return new Response("Server error", {
      status: 500,
    });
  }
};
