import { NextResponse } from "next/server";
import { getMailLogs, getMailUserStats } from "@/lib/db";
import { store } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { adminToken?: string };
  const expectedToken = process.env.ADMIN_TOKEN;

  if (expectedToken && body.adminToken !== expectedToken) {
    return NextResponse.json({ error: "Invalid admin token." }, { status: 401 });
  }

  try {
    const [logs, users] = await Promise.all([getMailLogs(150), getMailUserStats()]);
    return NextResponse.json({ logs, users });
  } catch (error) {
    console.error("[admin] mail logs database unavailable, using memory store", error);
    const users = Array.from(
      store.mailLogs.reduce((map, log) => {
        const current = map.get(log.userEmail) ?? {
          failed: 0,
          lastActivity: "",
          sent: 0,
          total: 0,
          userEmail: log.userEmail,
        };
        current.total += 1;
        current.sent += log.status === "sent" ? 1 : 0;
        current.failed += log.status === "failed" ? 1 : 0;
        current.lastActivity = current.lastActivity || log.createdAt;
        map.set(log.userEmail, current);
        return map;
      }, new Map<string, { failed: number; lastActivity: string; sent: number; total: number; userEmail: string }>()),
    ).map(([, value]) => value);

    return NextResponse.json({
      logs: store.mailLogs,
      users,
      warning: "Database unavailable. Showing temporary memory logs only.",
    });
  }
}
