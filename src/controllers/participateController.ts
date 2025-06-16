import {Lot, TgUser} from "../db/models";
import {Request, Response} from "express";
import {publishResults} from "../bot/commands/publishResults";

interface ParticipateBody {
  lotId: string;
  telegramId: number;
  username?: string;
  first_name?: string;
}

export const participate = async (req: Request, res: Response) => {
  const { lotId, telegramId, first_name, username } = req.body as ParticipateBody;
  const bot = req.app.locals.bot as any;
  if (!lotId || !telegramId) {
    return res.status(400).json({ message: 'lotId and telegramId are required' });
  }

  try {
    const lot = await Lot.findById(lotId).populate('channels').populate('publishChannel');
    if (!lot) {
      return res.status(404).json({ message: 'Lot not found' });
    }

    if (lot.status !== 'ongoing') {
      return res.status(400).json({ message: 'Oʻyin oʻz nihoyasiga yetdi' });
    }

    // 2) verify membership in each channel
     for (const ch of (lot.channels as any[])) {
      const member = await bot.telegram.getChatMember(ch.telegramId as number, telegramId);
      if (['left', 'kicked'].includes(member.status)) {
        return res
          .status(403)
          .json({ message: `Tanlov shartida koʻrsatilgan kanallarga aʼzo boʻling` });
      }
    }

    // 3) find or create the TgUser record
    let user = await TgUser.findOne({ telegramId });
    if (!user) {
      user = await TgUser.create({ telegramId, first_name, username });
    }

    if (lot.participants.some(p => p.equals(user._id))) {
      return res
        .status(400)
        .json({ message: 'Siz allaqachon oʻyin ishtirokchisi hisoblanasiz' });
    }

    // 4) add to participants if not already
    const uid = user._id.toString();
    if (!lot.participants.map(id => id.toString()).includes(uid)) {
      lot.participants.push(user._id);
      await lot.save();
    }

    if (lot.participants.length >= lot.stopCount) {
      await publishResults(bot, lot._id.toString())
    }

    const count = lot.participants.length;

    const deepLink = `https://t.me/randuz_bot/zbb?startapp=${lot._id}`;

    const newKeyboard = {
      inline_keyboard: [[
        { text: `${lot.participateBtnText} (${count})`, url: deepLink }
      ]]
    };

    await bot.telegram.editMessageReplyMarkup(
      // @ts-ignore
      lot.publishChannel.telegramId,
      lot.publishedMessageId,
      undefined,
      newKeyboard
    );

    res.status(200).json({ message: 'Yutuqli oʻyinga muvaffaqiyatli qoʻshildingiz' });
  } catch (err: any) {
    console.error('Participate error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}