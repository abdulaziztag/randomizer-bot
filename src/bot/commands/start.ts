import {Context, Markup} from 'telegraf';
import {TgUser, User} from "../../db/models";

export const handleStartCommand = async (ctx: Context) => {
  const from = ctx.from
  if (!from) return await ctx.reply('Please start the bot again.');

  try {
    await User.findOneAndUpdate({telegramId: from.id}, {
      $setOnInsert: {
        telegramId: from.id,
        username: from.username,
        first_name: from.first_name,
        lots: [],
        channels: []
      }
    }, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    })
    await TgUser.findOneAndUpdate({telegramId: from.id}, {
      $setOnInsert: {
        telegramId: from.id,
        username: from.username,
        first_name: from.first_name,
      }
    }, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    })
  } catch (error) {
    console.log('Error updating user:', error);
  }

  await ctx.reply(
    '👋 Welcome! Use the buttons below or type a command.',
    Markup.keyboard([
      ['🆕 New Lot'],
      ['📦 My Lots', '📡 My Channels']
    ])
      .resize()
      .oneTime(false)
  );
};