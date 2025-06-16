import { Context } from 'telegraf';

export const handleAddChannelCommand = async (ctx: Context) => {
    await ctx.answerCbQuery(); // Dismiss loading spinner
  
    await ctx.replyWithMarkdownV2(`
  *Инструкция:*
    `);
  }