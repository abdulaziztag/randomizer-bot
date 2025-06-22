import {Types} from "mongoose";

export interface ILot {
  name: string;
  startText?: string;
  startTextEntities?: any[];
  startMedia?: string;
  mediaType?: 'photo' | 'video' | 'animation';
  participateBtnText: string;
  channels: Types.ObjectId[];
  publishChannel: Types.ObjectId;
  winnersCount: number;
  publishTime: Date;
  winners: Types.ObjectId[];
  participants: Types.ObjectId[];
  stopType: 'time' | 'count';
  stopDate: Date;
  stopCount: number;
  announceTemplate?: string;
  status: 'new' | 'ongoing' | 'finished';
  publishedMessageId?: number;
}