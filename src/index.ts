import { connectDB } from './db';
import { createBot } from './bot/setup';
import nodeCron from "node-cron";
import cors from 'cors';
import express from 'express';
import {publishLot} from "./bot/commands/publishLot";
import {participationRoutes} from "./routes";
import {HoldingByTimeLot} from "./db/models";
import {publishResults} from "./bot/commands/publishResults";

async function startApp() {
  const app = express();
  await connectDB();

  const bot = createBot();
  app.locals.bot = bot;
  void bot.launch();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api', participationRoutes)
  app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
  })
  console.log('Bot is running...');
  nodeCron.schedule('0 * * * * *', () => publishLot(bot));

  nodeCron.schedule('0 * * * * *', async () => {
    const due = await HoldingByTimeLot.find({ time: { $lte: new Date() } });
    await Promise.all(due.map(async h => {
      await publishResults(bot, h._id.toString());
      await h.deleteOne();
    }));
  });
}

startApp();