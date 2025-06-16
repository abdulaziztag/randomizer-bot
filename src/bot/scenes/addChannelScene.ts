import { Scenes } from 'telegraf';
import { isTextMessage } from '../../helpers/isTextMessage';
import { Channel, User } from '../../db/models';

export const addChannelScene = new Scenes.WizardScene(
  'add-channel-wizard',

  // Step 1: instructions
  async (ctx) => {
    await ctx.reply(
      `📢 Инструкция:\n\n` +
      `➕ Добавьте бота @${ctx.botInfo.username} в ваш канал или группу как администратора с правом публикации сообщений.\n\n` +
      `🔗 Затем:\n` +
      `• Для *публичных* каналов — отправьте @username канала.\n` +
      `• Для *приватных* каналов или групп — перешлите любое сообщение оттуда сюда.`
    );
    return ctx.wizard.next();
  },

  // Step 2: wait for @username or forwarded message
  async (ctx) => {
    const from = ctx.from;
    if (!from) {
      await ctx.reply('❌ Не удалось определить пользователя.');
      return ctx.scene.leave();
    }

    const user = await User.findOne({ telegramId: from.id });
    if (!user) {
      await ctx.reply('❌ Пользователь не найден в базе.');
      return ctx.scene.leave();
    }

    // 1) Forwarded message
    // 1) Forwarded message
    const fwd = (ctx.message as any)?.forward_from_chat;
    if (fwd) {
      const chatId = fwd.id;

      try {
        // Ensure bot can access the chat
        try {
          await ctx.telegram.getChat(chatId);
        } catch (err: any) {
          if (err.code === 403) {
            await ctx.reply('❌ Бот не является участником этого канала. Добавьте бота и попробуйте снова.');
            return;
          }
          throw err;
        }

        const admins = await ctx.telegram.getChatAdministrators(chatId);
        const botId = (await ctx.telegram.getMe()).id;

        const userIsAdmin = admins.some(a => a.user.id === from.id);
        const botIsAdmin = admins.some(a => a.user.id === botId);

        if (!userIsAdmin) {
          await ctx.reply('❌ Вы должны быть админом этого канала.');
          return;
        }
        if (!botIsAdmin) {
          await ctx.reply(`❌ Бот не является админом в "${fwd.title}". Добавьте его и попробуйте снова.`);
          return;
        }

        let channel = await Channel.findOne({ telegramId: chatId });
        if (!channel) {
          channel = await Channel.create({
            telegramId: chatId,
            title: fwd.title,
            username: fwd.username,
            type: fwd.type,
            addedBy: user._id
          });
        }

        if (!user.channels.includes(channel._id)) {
          user.channels.push(channel._id);
          await user.save();
        }

        await ctx.reply(`✅ Канал/группа "${fwd.title}" успешно добавлен! \nЧтобы создать новый розыгрыш, введите команду /new_lot`);
        return ctx.scene.leave();

      } catch (err) {
        console.error(err);
        await ctx.reply('⚠️ Не удалось обработать канал. Убедитесь, что бот имеет доступ и попробуйте снова.');
        return;
      }
    }
    // 2) Public @username
    if (isTextMessage(ctx.message)) {
      const input = ctx.message.text.trim();
      if (!input.startsWith('@')) {
        await ctx.reply('❌ Это не похоже на @username. Пожалуйста, отправьте правильный username или перешлите сообщение из канала.');
        return; // ← don't leave
      }

      try {
        const chat = await ctx.telegram.getChat(input);

        if (chat.type !== 'channel' && chat.type !== 'supergroup' && chat.type !== 'group') {
          await ctx.reply('❌ Это не канал или группа. Попробуйте снова.');
          return;
        }

        const admins = await ctx.telegram.getChatAdministrators(chat.id);
        const botId = (await ctx.telegram.getMe()).id;

        const userIsAdmin = admins.some(a => a.user.id === from.id);
        const botIsAdmin = admins.some(a => a.user.id === botId);

        if (!userIsAdmin) {
          await ctx.reply('❌ Вы должны быть администратором этого канала.');
          return;
        }

        if (!botIsAdmin) {
          await ctx.reply(`❌ Бот не является админом в "${chat.title}". Пожалуйста, добавьте его.`);
          return;
        }

        let channel = await Channel.findOne({ telegramId: chat.id });
        const username = 'username' in chat ? chat.username : 'Без названия';

        if (!channel) {
          channel = await Channel.create({
            telegramId: chat.id,
            title: chat.title,
            username,
            type: chat.type,
            addedBy: user._id
          });
        }

        if (!user.channels.includes(channel._id)) {
          user.channels.push(channel._id);
          await user.save();
        }

        await ctx.reply(`✅ Публичный канал "${chat.title}" успешно добавлен!`);
        return ctx.scene.leave();

      } catch (err) {
        console.error(err);
        await ctx.reply('⚠️ Не удалось получить данные о канале. Убедитесь, что бот добавлен и попробуйте снова.');
        return;
      }
    }

    // fallback: unknown message
    await ctx.reply('⚠️ Я жду или @username, или пересланное сообщение из канала.');
    return;
  }
);