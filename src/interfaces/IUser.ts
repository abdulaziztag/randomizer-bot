import {Types} from "mongoose";

export interface ITelegramUser {
  first_name: string;
  telegramId: number;
  username: string;
}

export interface IUser extends ITelegramUser {
  lots: Types.ObjectId[];
  channels: Types.ObjectId[];
}