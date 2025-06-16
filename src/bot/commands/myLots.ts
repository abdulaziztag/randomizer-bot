// src/bot/commands/myLots.ts
import { Context, Markup } from 'telegraf';
import {User, Lot, HoldingByTimeLot} from '../../db/models';
import { handleStartCommand } from './start';

const EXIT_KEYWORDS = [
  '/start', '/new_lot', '/my_channels',
  '🆕 New Lot', '📡 My Channels'
];

// Handler for showing user's lots
export async function handleMyLotsCommand(ctx: Context) {
  // @ts-ignore
  const text = ctx.message?.text;
  // scene breaker: exit if user taps a main command
  if (text && EXIT_KEYWORDS.includes(text)) {
    await handleStartCommand(ctx);
    return;
  }

  const tgId = ctx.from?.id;
  if (!tgId) return;

  // Find the user
  const user = await User.findOne({ telegramId: tgId }).populate('lots');
  if (!user || !user.lots || user.lots.length === 0) {
    await ctx.reply(
      '📭 У вас пока нет созданных лотов.',
      Markup.keyboard([['🆕 New Lot'], ['📦 My Lots','📡 My Channels']])
        .resize()
    );
    return;
  }

  // Build inline buttons for each lot
  const buttons = (user.lots as any[]).map(lot => (
    Markup.button.callback(lot.name, `lot_select:${lot._id}`)
  ));

  await ctx.reply(
    '📦 Ваши лоты: (нажмите на название)',
    Markup.inlineKeyboard(buttons, { columns: 1 })
  );
}

// Handler when user selects a lot
export async function handleLotSelect(ctx: Context) {
  // Only handle callback queries
  // @ts-ignore
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('lot_select:')) return;

  await ctx.answerCbQuery();
  const lotId = data.split(':')[1];

  // Fetch lot with participants array
  const lot = await Lot.findById(lotId).populate('participants');
  if (!lot) {
    await ctx.reply('❌ Лот не найден.');
    return;
  }

  const participantsCount = Array.isArray(lot.participants)
    ? lot.participants.length
    : 0;

  const infoLines = [];
  infoLines.push(`🔖 Название: ${lot.name}`);
  infoLines.push(`👥 Участников сейчас: ${participantsCount}`);
  infoLines.push(`🏆 Победителей: ${lot.winnersCount}`);
  infoLines.push(`⏰ Опубликуется: ${lot.publishTime.toLocaleString()}`);
  infoLines.push(`⏹ Окончание: ${
    lot.stopType === 'time'
  // @ts-ignore
      ? (lot.stopDate as Date).toLocaleString()
  // @ts-ignore
      : `${lot.stopCount} участников`
  }`);

  await ctx.reply(
    infoLines.join('\n'),
    Markup.inlineKeyboard([
  // @ts-ignore
      [Markup.button.callback('🗑️ Удалить лот', `lot_delete:${lotId}`)],
  // @ts-ignore
      [Markup.button.callback('🔙 Назад', 'lot_back')]
    ], { columns: 1 })
  );
}

// Handler for deleting a lot
export async function handleLotDelete(ctx: Context) {
  // @ts-ignore
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith('lot_delete:')) return;

  const lotId = data.split(':')[1];
  const tgId = ctx.from?.id;
  if (!tgId) return;

  // 1) Remove the Lot doc
  await Lot.findByIdAndDelete(lotId);
  // 2) Pull from user's `lots` array
  await User.updateOne(
    { telegramId: tgId },
    { $pull: { lots: lotId } }
  );
  // 3) Clean up any time‐holding record
  await HoldingByTimeLot.deleteOne({ _id: lotId });

  await ctx.reply('🗑️ Лот успешно удален.');
  // 4) Re‐list remaining lots
  return handleMyLotsCommand(ctx);
}

// Handler for 'Back' button
export async function handleLotBack(ctx: Context) {
  await ctx.answerCbQuery();
  return handleMyLotsCommand(ctx);
}
