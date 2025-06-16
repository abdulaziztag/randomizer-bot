import { commandsList } from "./commandsList";
import { Context, MiddlewareFn } from "telegraf";

export const handle404Commands: MiddlewareFn<Context> = async (ctx, next) => {
    const knownCommands = commandsList;
    if (!ctx.message || !('text' in ctx.message)) {
        return next();
    }
    const messageText = ctx.message.text;
  
    if (messageText?.startsWith('/')) {
        await ctx.reply('❓ Неизвестная команда. Используйте /start чтобы увидеть доступные команды.');
        return;
      }
    
      await ctx.reply('🤖 Я не понял это сообщение. Пожалуйста, используйте кнопки или команды.');
  
    return next();
}