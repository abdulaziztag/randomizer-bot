import {Types} from "mongoose";

export const ChannelTypes = ['channel', 'supergroup', 'group'] as const;

export type ChannelType = typeof ChannelTypes[number];

export interface IChannel {
  telegramId: number,
  title?: string,
  username?: string
  type: ChannelType,
  addedBy: Types.ObjectId
}