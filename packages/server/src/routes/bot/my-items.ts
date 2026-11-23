import { Hono } from "hono";
import { db } from "../../db";
import { getWebUrl } from "../../lib/constants/urls";
import { myReservationsEmbed, myTradeOffersEmbed } from "../../lib/customer-list-embeds";
import { findUserIdByDiscordUser } from "../../lib/discord/user-links";
import { listOutgoingTradeOffers } from "../../lib/guest-trade-offers";
import { listMyCardReservations } from "../../lib/my-card-reservations";
import type { AppEnv } from "../../middleware/auth";

export const botMyItemsRoute = new Hono<AppEnv>()
  .get("/my-reservations", async (c) => {
    const discordUserId = c.req.query("discordUserId");
    if (!discordUserId) {
      return c.json({ success: false, message: "discordUserId is required." }, 400);
    }
    const userId = await findUserIdByDiscordUser(discordUserId);
    if (!userId) return c.json({ success: false, message: "account_not_linked" }, 404);
    const reservations = await db.transaction((tx) => listMyCardReservations(tx, userId));
    return c.json({ success: true, data: { embed: myReservationsEmbed(reservations, getWebUrl()) } });
  })
  .get("/my-trade-offers", async (c) => {
    const discordUserId = c.req.query("discordUserId");
    if (!discordUserId) {
      return c.json({ success: false, message: "discordUserId is required." }, 400);
    }
    const userId = await findUserIdByDiscordUser(discordUserId);
    if (!userId) return c.json({ success: false, message: "account_not_linked" }, 404);
    const offers = await db.transaction((tx) => listOutgoingTradeOffers(tx, userId));
    return c.json({ success: true, data: { embed: myTradeOffersEmbed(offers, getWebUrl()) } });
  });
