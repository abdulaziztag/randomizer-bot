import { session, Telegraf } from 'telegraf';
import { handleStartCommand } from './commands/start';
import { handleNewLotCommand } from './commands/newLot';
import {handleLotBack, handleLotDelete, handleLotSelect, handleMyLotsCommand} from './commands/myLots';
import { handleMyChannelsCommand } from './commands/myChannels';
import { CONFIG } from '../config';
import { handleAddChannelCommand } from './commands/addChannel';
import { handle404Commands } from './commands/command404';
import { stage } from './scenes';
import {requireChannels} from "./middlewares/requireChannels";

export function createBot() {
  const token = CONFIG.BOT_TOKEN;
  const bot = new Telegraf(token);
  bot.use(session())
  // @ts-ignore
  bot.use(stage.middleware());

  void bot.telegram.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'new_lot', description: 'Create a new draw' },
    { command: 'my_lots', description: 'View your draws' },
    { command: 'my_channels', description: 'View your channels' },
  ]);

  // @ts-ignore
  bot.hears('🆕 New Lot',requireChannels, ctx => ctx.scene.enter('create-lot-wizard'));
  bot.hears('📦 My Lots', handleMyLotsCommand);
  bot.hears('📡 My Channels', handleMyChannelsCommand);


  // @ts-ignore
  bot.command('new_lot', requireChannels, ctx => ctx.scene.enter('create-lot-wizard'));
  bot.start(handleStartCommand);
  bot.command('my_lots', handleMyLotsCommand);
  bot.command('my_channels', handleMyChannelsCommand);

  bot.on('text', handle404Commands);


  bot.action(/^lot_select:/, handleLotSelect);
  bot.action(/^lot_delete:/, handleLotDelete);
  bot.action('lot_back', handleLotBack);

  bot.hears(/^@[\w\d_]+$/, async (ctx) => {
    const channelUsername = ctx.message.text;
  
    try {
      const chatMember = await ctx.telegram.getChatAdministrators(channelUsername);
      const userId = ctx.from?.id;
      const botId = (await ctx.telegram.getMe()).id;
  
      const userIsAdmin = chatMember.some(admin => admin.user.id === userId);
      const botIsAdmin = chatMember.some(admin => admin.user.id === botId);
  
      if (userIsAdmin && botIsAdmin) {
        await ctx.reply(`✅ Канал ${channelUsername} успешно добавлен!`);
      } else if (!botIsAdmin) {
        await ctx.reply(`❗️Бот не является админом в ${channelUsername}. Пожалуйста, добавьте его.`);
      } else if (!userIsAdmin) {
        await ctx.reply(`❗️Вы не являетесь админом в ${channelUsername}. Только админ может добавить канал.`);
      }
    } catch (error) {
      console.error(error);
      await ctx.reply('⚠️ Не удалось получить информацию о канале. Убедитесь, что канал существует и бот добавлен.');
    }
  });

  bot.action('add_channel', async (ctx) => {
    await ctx.answerCbQuery();
    // @ts-ignore
    await ctx.scene.enter('add-channel-wizard');
  });

  return bot;
}