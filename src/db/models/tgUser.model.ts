import { Schema, model } from 'mongoose';
import {ITelegramUser} from "../../interfaces/IUser";

const tgUserSchema = new Schema<ITelegramUser>({
  telegramId: { type: Number, required: true, unique: true },
  first_name: { type: String, required: true },
  username: { type: String }
}, {
  timestamps: true
});

export const TgUser = model<ITelegramUser>('TgUser', tgUserSchema);