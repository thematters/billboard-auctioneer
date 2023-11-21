import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const GET = async (req: NextRequest) => {
  if (
    req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const result = await fetch(
    "http://worldtimeapi.org/api/timezone/America/Chicago",
    {
      cache: "no-store",
    },
  );
  const data = await result.json();

  return new Response(
    JSON.stringify({ success: true, datetime: data.datetime }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
};
