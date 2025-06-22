import {Markup, Telegraf} from 'telegraf';
import {HoldingByTimeLot, Lot} from '../../db/models';
import dayjs from "dayjs";

function escapeMdV2(str: string) {
  return str.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export const publishLot = async (bot: Telegraf) => {
  const now = dayjs().utc().toDate();
  const dueLots = await Lot.find({status: 'new', publishTime: {$lte: now}})
    .populate('channels')
    .populate('publishChannel');

  // const dueLots = await Lot.find({_id: '683b6265bb67dea7887c39d0'})
  //   .populate('channels')
  //   .populate('publishChannel');

  for (const lot of dueLots) {
    const pubCh: any = (lot.publishChannel as any).telegramId;

    const lines: string[] = [
      lot?.startText ?? ''
    ];

    const caption = lines.join('\n');

    const participateUrl = `https://t.me/randuz_bot/zbb?startapp=${lot._id}`;
    const btnLabel = `${lot.participateBtnText} (${lot.participants.length})`;
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url(btnLabel, participateUrl)]
    ]);

    const opts = {
      // parse_mode: 'MarkdownV2' as const,
      disable_web_page_preview: true,
      ...keyboard
    };

    let sent;

    if (lot.startMedia && lot.mediaType) {
      switch (lot.mediaType) {
        case 'photo':
          sent = await bot.telegram.sendPhoto(pubCh, lot.startMedia, { caption, caption_entities: lot.startTextEntities, ...opts });
          break;
        case 'video':
          sent = await bot.telegram.sendVideo(pubCh, lot.startMedia, { caption, caption_entities: lot.startTextEntities, ...opts });
          break;
        case 'animation':
          sent = await bot.telegram.sendAnimation(pubCh, lot.startMedia, { caption, caption_entities: lot.startTextEntities,  ...opts });
          break;
        default:
          sent = await bot.telegram.sendDocument(pubCh, lot.startMedia, { caption, caption_entities: lot.startTextEntities, ...opts });
      }
    } else {
      sent = await bot.telegram.sendMessage(pubCh, caption, {entities: lot.startTextEntities, ...opts});
    }

    lot.publishedMessageId = sent?.message_id;
    lot.status = 'ongoing';
    await lot.save();


    if (lot.stopType === 'time') {
      await HoldingByTimeLot.create({
        _id: lot._id,
        time: lot.stopDate
      })
    }
  }
};