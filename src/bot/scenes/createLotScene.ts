// src/bot/scenes/createLotScene.ts
import {Scenes, Markup} from 'telegraf';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import {User, Lot} from '../../db/models';
import {ILot} from '../../interfaces/ILot';
import {handleStartCommand} from "../commands/start";


interface WizardState extends Omit<ILot, 'publishTime' | 'stopValue'> {
  selectedChannels?: string[];
  validChannels?: { id: string; title: string }[];
  publishChannelId?: string;
  publishTime?: Date;
  stopValueDate?: Date;
  stopValueCount?: number;
}

const EXIT_KEYWORDS = [
  '/start', '/new_lot', '/my_lots', '/my_channels',
  '🆕 New Lot', '📦 My Lots', '📡 My Channels'
];

dayjs.extend(utc);
dayjs.extend(customParseFormat);

export const createLotScene = new Scenes.WizardScene(
  'create-lot-wizard',

  // STEP 1 — Lot name
  async (ctx) => {
    await ctx.reply('📝 Введите название лота:', Markup.inlineKeyboard([
      Markup.button.callback('Отменить создание', 'cancel')
    ], {columns: 2}));
    return ctx.wizard.next();
  },

  // STEP 2 — Start text
  async (ctx) => {
    // @ts-ignore
    const text = ctx.message?.text?.trim();

    if (text === 'cancel') {
      await ctx.answerCbQuery();
      await ctx.scene.leave();
      return handleStartCommand(ctx);
    }

    if (!text) {
      await ctx.reply('❗ Пожалуйста, введите название лота.');
      return;
    }
    (ctx.wizard.state as WizardState).name = text;
    await ctx.reply(
      '🏁 Теперь отправьте *одно* медиа-сообщение (фото, видео или GIF). ' +
      'Если хотите, добавьте к нему подпись — она станет стартовым текстом лота. ' +
      'Или просто отправьте текст без медиа, если не нужно медиа-превью.',
      Markup.inlineKeyboard([
        Markup.button.callback('Назад', 'go_back'),
        Markup.button.callback('Отменить создание', 'cancel')
      ], {columns: 2})
    );
    return ctx.wizard.next();
  },

  // STEP 3 — Capture start text
  async (ctx) => {
    // @ts-ignore
    const msg = ctx.message;
    let fileId: string | null = null;
    let text: string | undefined;
    let mediaType: 'photo' | 'video' | 'animation' | undefined = undefined;

    // @ts-ignore
    if ('text' in msg && msg.text === 'go_back') {
      await ctx.answerCbQuery();
      // @ts-ignore
      return ctx.wizard.select(1);
    }

    // @ts-ignore
    if ('text' in msg && msg.text === 'go_back') {
      await ctx.answerCbQuery();
      await ctx.scene.leave();
      return handleStartCommand(ctx);
    }

    // 1) If it's media, capture its file_id
    // @ts-ignore
    if ('photo' in msg && msg.photo) {
      const photos = msg.photo;
      fileId = photos[photos.length - 1].file_id;
      mediaType = 'photo';
    } else { // @ts-ignore
      if ('video' in msg && msg.video) {
        fileId = msg.video.file_id;
        mediaType = 'video';
      } else { // @ts-ignore
        if ('animation' in msg && msg.animation) {
          fileId = msg.animation.file_id;
          mediaType = 'animation';
        }
      }
    }

    // 2) If there's a caption or plain text, capture that as startText
    // @ts-ignore
    text = ('caption' in msg && msg.caption)
      ? msg.caption.trim()
      // @ts-ignore
      : ('text' in msg && msg.text)
        ? msg.text.trim()
        : undefined;
    if (!fileId && !text) {
      await ctx.reply('❗ Пожалуйста, отправьте медиа-сообщение или текст.');
      return;
    }
    if (EXIT_KEYWORDS.includes(text!)) {
      await ctx.scene.leave();
      return ctx.reply('Отмена создания лота.');
    }
    const state = ctx.wizard.state as WizardState;
    state.startMedia = fileId ?? undefined;
    state.startText = text ?? '';
    state.mediaType = mediaType;

    await ctx.reply(
      '✏️ Введите текст кнопки для участников или выберите шаблон:',
      Markup.inlineKeyboard([
        [Markup.button.callback('Participate', 'btnText:Participate')],
        [Markup.button.callback('Участвовать', 'btnText:Участвовать')],
        [Markup.button.callback('Ishtirok etish', 'btnText:Ishtirok etish')],
        [Markup.button.callback('Назад', 'go_back')],
        [Markup.button.callback('Отменить создание', 'cancel')]
      ])
    );
    return ctx.wizard.next();
  },

  // STEP 4 — Button text & channel selection
  async (ctx) => {
    const state = ctx.wizard.state as WizardState;
    // @ts-ignore
    const cb = ctx.callbackQuery?.data;
    // @ts-ignore
    const text = !cb ? ctx.message?.text?.trim() : undefined;

    if (cb?.startsWith('btnText:')) {
      state.participateBtnText = cb.split(':')[1];
      await ctx.answerCbQuery();
      await ctx.reply(`Текст кнопки установлен: "${state.participateBtnText}"`);
    } else if (text) {
      state.participateBtnText = text;
      await ctx.reply(`Текст кнопки установлен: "${state.participateBtnText}"`);
    } else {
      return;
    }

    // Channels for participation
    state.selectedChannels = [];
    state.validChannels = [];
    const user = await User.findOne({telegramId: ctx.from!.id}).populate('channels');
    const botId = (await ctx.telegram.getMe()).id;
    for (const ch of (user!.channels as any[])) {
      try {
        const admins = await ctx.telegram.getChatAdministrators(ch.telegramId);
        if (admins.some(a => a.user.id === botId)) {
          state.validChannels!.push({id: ch._id.toString(), title: ch.title || ch.username || 'Без названия'});
        }
      } catch {
      }
    }
    if (!state.validChannels!.length) {
      await ctx.reply('❗ У вас нет каналов, где бот является админом.');
      return ctx.scene.leave();
    }
    const buttons = state.validChannels!.map(ch =>
      Markup.button.callback(`❌ ${ch.title}`, `toggle_channel:${ch.id}`)
    );
    buttons.push(Markup.button.callback('✅ Готово', 'channels_done'));
    await ctx.reply('📡 Выберите каналы для участия:', Markup.inlineKeyboard(buttons, {columns: 2}));
    return ctx.wizard.next();
  },

  // STEP 5 — Toggle channels & ask publish-channel
  async (ctx) => {
    // @ts-ignore
    const data = ctx.callbackQuery?.data;
    if (!data) return;
    const state = ctx.wizard.state as WizardState;

    if (data.startsWith('toggle_channel:')) {
      const id = data.split(':')[1];
      const sel = state.selectedChannels!;
      const idx = sel.indexOf(id);
      if (idx === -1) sel.push(id); else sel.splice(idx, 1);
      const buttons = state.validChannels!.map(ch => {
        const prefix = sel.includes(ch.id) ? '✅' : '❌';
        return Markup.button.callback(`${prefix} ${ch.title}`, `toggle_channel:${ch.id}`);
      });
      buttons.push(Markup.button.callback('✅ Готово', 'channels_done'));
      await ctx.editMessageReplyMarkup(Markup.inlineKeyboard(buttons, {columns: 2}).reply_markup!);
      await ctx.answerCbQuery();
      return;
    }

    if (data === 'channels_done') {
      await ctx.answerCbQuery();
      const picked = state.selectedChannels!;
      const titles = state.validChannels!
        .filter(ch => picked.includes(ch.id))
        .map(ch => ch.title);
      await ctx.reply(`Вы выбрали каналы: ${titles.join(', ')}`);

      const channelIds = picked.length ? picked : state.validChannels!.map(ch => ch.id);
      const publishButtons = state.validChannels!
        .filter(ch => channelIds.includes(ch.id))
        .map(ch => Markup.button.callback(ch.title, `publish_channel:${ch.id}`));
      await ctx.reply('📢 В каком канале опубликовать лот?', Markup.inlineKeyboard(publishButtons, {columns: 1}));
      return ctx.wizard.next();
    }
  },

  // STEP 6 — Publish channel & ask winners count
  async (ctx) => {
    // @ts-ignore
    const data = ctx.callbackQuery?.data;
    if (!data?.startsWith('publish_channel:')) return;
    await ctx.answerCbQuery();
    const [, id] = data.split(':');
    const state = ctx.wizard.state as WizardState;
    state.publishChannelId = id;
    await ctx.reply('🏆 Сколько победителей будет? Введите число:');
    return ctx.wizard.next();
  },

  // STEP 7 — Winners count & ask publish time
  async (ctx) => {
    // @ts-ignore
    const text = ctx.message?.text?.trim();
    const n = Number(text);
    if (!text || isNaN(n) || n < 1) {
      await ctx.reply('❗ Введите корректное число победителей.');
      return;
    }
    const state = ctx.wizard.state as WizardState;
    state.winnersCount = n;
    await ctx.reply(
      '🕑 Когда опубликовать лот? Нажмите «Сейчас» или введите дату DD.MM.YY HH:MM:',
      Markup.inlineKeyboard([[Markup.button.callback('Сейчас', 'publish_time:now')]])
    );
    return ctx.wizard.next();
  },

  // STEP 8 — Publish time & ask stop condition
  async (ctx) => {
    const state = ctx.wizard.state as WizardState;
    // @ts-ignore
    const cb = ctx.callbackQuery?.data;
    if (cb === 'publish_time:now') {
      state.publishTime = dayjs().utc().add(1, 'minute').toDate();
      await ctx.answerCbQuery();
    } else {
      // @ts-ignore
      const text = ctx.message?.text?.trim();
      const re = /^\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}$/;
      if (!text || !re.test(text)) {
        await ctx.reply('❗ Формат неверен. DD.MM.YYYY HH:MM.');
        return;
      }
      state.publishTime = dayjs(text, 'DD.MM.YYYY HH:mm').subtract(5, 'hour').toDate();
    }
    await ctx.reply(
      '⏹ Как завершить лот?',
      Markup.inlineKeyboard([
        [Markup.button.callback('По времени', 'stop_by:time')],
        [Markup.button.callback('По участникам', 'stop_by:count')]
      ])
    );
    return ctx.wizard.next();
  },

  // STEP 9 — Stop condition & ask detail
  async (ctx) => {
    // @ts-ignore
    const data = ctx.callbackQuery?.data;
    if (!data?.startsWith('stop_by:')) return;
    await ctx.answerCbQuery();
    const [, type] = data.split(':');
    const state = ctx.wizard.state as WizardState;
    state.stopType = type as any;
    if (type === 'time') {
      await ctx.reply('⏰ Введите время окончания DD.MM.YYYY HH:MM:');
    } else {
      await ctx.reply('🔢 Введите количество участников для завершения:');
    }
    return ctx.wizard.next();
  },

  // STEP 10 — Stop value & ask announcement
  async (ctx) => {
    const state = ctx.wizard.state as WizardState;
    // @ts-ignore
    const text = ctx.message?.text?.trim();
    if (!text) return;
    if (state.stopType === 'time') {
      const re = /^\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}$/;
      if (!re.test(text)) {
        await ctx.reply('❗ Неверный формат. DD.MM.YYYY HH:MM.');
        return;
      }
      state.stopValueDate = dayjs(text, 'DD.MM.YYYY HH:mm').subtract(5, 'hour').toDate();
    } else {
      const num = Number(text);
      if (isNaN(num) || num < 1) {
        await ctx.reply('❗ Некорректное число.');
        return;
      }
      state.stopValueCount = num;
    }
    await ctx.reply(
      '🔔 Введите текст для объявления победителей, используйте ^winners^ для списка.'
    );
    return ctx.wizard.next();
  },

  // STEP 11 — Announcement & summary
  async (ctx) => {
    // @ts-ignore
    const text = ctx.message?.text;
    if (!text || !text.includes('^winners^')) {
      await ctx.reply('❗ Текст должен содержать ^winners^.');
      return;
    }
    const state = ctx.wizard.state as WizardState;
    state.announceTemplate = text;
    const lines: string[] = [];
    lines.push(`Название: ${state.name}`);
    lines.push(`Стартовый текст: ${state.startText}`);
    lines.push(`Кнопка: ${state.participateBtnText}`);
    const parts = state.validChannels!
      .filter(ch => state.selectedChannels!.includes(ch.id))
      .map(ch => ch.title);
    lines.push(`Участие: ${parts.join(', ') || 'Без требований'}`);
    const pubCh = state.validChannels!.find(ch => ch.id === state.publishChannelId!);
    lines.push(`Публикация: ${pubCh?.title || 'Без требований'}`);
    lines.push(`Победители: ${state.winnersCount}`);
    lines.push(`Публикация: ${dayjs(state.publishTime).add(5, 'hour').format('DD.MM.YY HH:mm')}`);
    if (state.stopType === 'time') {
      lines.push(`Завершение по времени: ${dayjs(state.stopValueDate).add(5, 'hour').format('DD.MM.YY HH:mm')}`);
    } else {
      lines.push(`Завершение по участникам: ${state.stopValueCount}`);
    }
    lines.push(`Шаблон: ${state.announceTemplate}`);

    await ctx.reply(lines.join('\n'),
      Markup.inlineKeyboard([
        [Markup.button.callback('✅ ОК', 'lot_confirm:ok')],
        [Markup.button.callback('❌ Отмена', 'lot_confirm:cancel')]
      ])
    );
    return ctx.wizard.next();
  },

  // STEP 12 — Confirmation & persistence
  async (ctx) => {
    // @ts-ignore
    const data = ctx.callbackQuery?.data;
    if (!data?.startsWith('lot_confirm:')) return;
    await ctx.answerCbQuery();
    if (data.endsWith(':cancel')) {
      await ctx.reply('❌ Создание лота отменено.');
      return ctx.scene.leave();
    }

    // OK → save
    const state = ctx.wizard.state as WizardState;
    const newLot = await Lot.create({
      name: state.name!,
      startText: state.startText!,
      startMedia: state.startMedia!,
      mediaType: state.mediaType!,
      participateBtnText: state.participateBtnText!,
      channels: state.selectedChannels!,
      publishChannel: state.publishChannelId!,
      winnersCount: state.winnersCount!,
      publishTime: state.publishTime!,
      winners: [],
      participants: [],
      stopType: state.stopType!,
      stopCount: state.stopValueCount!,
      stopDate: state.stopValueDate!,
      announceTemplate: state.announceTemplate!
    });

    await User.findOneAndUpdate({telegramId: ctx.from?.id}, {
      $push: {lots: newLot._id}
    })

    await ctx.reply('🎉 Лот успешно создан!');
    return ctx.scene.leave();
  }
);
