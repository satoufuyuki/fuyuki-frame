import { ActionFunctionArgs } from "@remix-run/node";
import { and, count, eq } from "drizzle-orm";
import { db } from "~/drizzle/config.server";
import { downloads } from "~/drizzle/schema";

export async function action({
  request
}: ActionFunctionArgs) {
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for") ?? "";
    const userAgent = request.headers.get("user-agent") ?? "";

    const [existing] = await db.select({ id: count() }).from(downloads).where(and(
        eq(downloads.senderIp, ip),
        eq(downloads.userAgent, userAgent)
    ));

    if (existing.id > 0) {
        return Response.json({
            status: 201
        })
    }

    await db.insert(downloads).values({
        senderIp: ip,
        userAgent: userAgent
    });

    return Response.json({
        status: 201
    })
}