import { Context, Markup } from 'telegraf';
import { User, Channel } from '../../db/models';

export const handleMyChannelsCommand = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;

  try {
    const user = await User.findOne({ telegramId }).populate('channels');
    if (!user) {
      await ctx.reply('❌ Пользователь не найден.');
      return;
    }

    const botId = (await ctx.telegram.getMe()).id;
    const validChannels = [];

    for (const channel of user.channels as any[]) {
      try {
        const admins = await ctx.telegram.getChatAdministrators(channel.telegramId);
        const botIsAdmin = admins.some(admin => admin.user.id === botId);

        if (botIsAdmin) {
          validChannels.push(channel);
        } else {
          console.log(`Bot is no longer admin in ${channel.username || channel.title}`);
          await Channel.deleteOne({ _id: channel._id });
          user.channels = user.channels.filter((c: any) => !c._id.equals(channel._id));
        }
      } catch (err) {
        console.warn(`Failed to check admin status in chat ${channel.telegramId}:`);
        // Optionally: remove channels the bot can’t access
        await Channel.deleteOne({ _id: channel._id });
        user.channels = user.channels.filter((c: any) => !c._id.equals(channel._id));
      }
    }

    await user.save();

    const buttons = validChannels.map(channel => [
      {
        text: channel.title || channel.username || 'Без названия',
        callback_data: `channel:${channel._id}`,
      },
    ]);

    await ctx.reply('📡 Ваши каналы:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Добавить канал', callback_data: 'add_channel' }],
          ...buttons,
        ],
      },
    });

  } catch (error) {
    console.error('Error fetching channels:', error);
    await ctx.reply('⚠️ Произошла ошибка при получении каналов.');
  }
};