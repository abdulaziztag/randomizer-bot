import { Telegraf } from 'telegraf';
import { Lot } from '../../db/models';
import {Document} from "mongoose";
import {ITelegramUser} from "../../interfaces/IUser";

type TgUserDoc = Document<unknown, {}, ITelegramUser> & ITelegramUser;

function escapeMdV2(str: string) {
  return str.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export async function publishResults(
  bot: Telegraf,
  lotId: string
): Promise<void> {
  // 1) Load the lot with participants and publishChannel
  const lot = await Lot.findById(lotId)
    .populate('publishChannel')
    .populate<{participants: TgUserDoc[]}>('participants');

  if (!lot) {
    throw new Error(`Lot ${lotId} not found`);
  }

  const participants = lot.participants;
  if (!participants.length) {
    throw new Error(`No participants for lot ${lotId}`);
  }

  for (let i = participants.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [participants[i], participants[j]] = [participants[j], participants[i]];
  }

  const winners = participants.slice(0, lot.winnersCount);

  lot.winners = winners.map(w => w._id) as any[];
  lot.status = 'finished';
  await lot.save();

  const mentions = winners.map(w => {
    if (w.username) return `@${w.username}`.replace(/_/g, '\\_');
    const safeName = w.first_name;
    return `[${safeName}](tg://user?id=${w.telegramId})`;
  });

  const announceTemplate = lot.announceTemplate || '^winners^';

  const fragments = announceTemplate.split(/\^winners\^/g)

  const bulletList = mentions.length
    ? '\n\\- ' + mentions.join('\n\\- ')
    : '';

  let assembled = '';
  for (let i = 0; i < fragments.length; i++) {
    assembled += escapeMdV2(fragments[i]);
    if (i === 0) assembled += bulletList;
    if (i > 0 && i < fragments.length - 1) {
      assembled += bulletList;
    }
  }

  const pubCh: any = lot.publishChannel;
  await bot.telegram.sendMessage(
    pubCh.telegramId,
    assembled,
    {
      parse_mode: 'MarkdownV2'
    }
  );
}