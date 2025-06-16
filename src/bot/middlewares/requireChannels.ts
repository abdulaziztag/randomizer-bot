// src/bot/middleware/requireChannels.ts
import { Context, Markup } from 'telegraf';
import { User } from '../../db/models';

export async function requireChannels(ctx: Context, next: () => any) {
  const tgId = ctx.from?.id;
  if (!tgId) return;

  const user = await User
    .findOne({ telegramId: tgId })
    .populate('channels');
  const hasChannels = Array.isArray(user?.channels) && user.channels.length > 0;

  if (!hasChannels) {
    return ctx.reply(
      '❗ У вас нет каналов, где бот является админом.\n' +
      'Сначала добавьте хотя бы один канал, чтобы создать лот.',
      Markup.inlineKeyboard([
        [ Markup.button.callback('➕ Добавить канал', 'add_channel') ],
        [ Markup.button.callback('📡 Мои каналы',    'my_channels') ]
      ])
    );
  }

  return next();
}