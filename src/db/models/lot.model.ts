import { Schema, model } from 'mongoose';
import {ILot} from "../../interfaces/ILot";

const lotSchema = new Schema<ILot>({
  name: { type: String, required: true },
  startText: { type: String },
  startTextEntities: { type: Array },
  startMedia: { type: String },
  mediaType: { type: String, enum: ['photo', 'video', 'animation'] },
  participateBtnText: { type: String, required: true },
  channels: [{ type: Schema.Types.ObjectId, ref: 'Channel' }],
  publishChannel: { type: Schema.Types.ObjectId, ref: 'Channel' },
  winnersCount: { type: Number, default: 1 },
  publishTime: { type: Date },
  winners: [{ type: Schema.Types.ObjectId, ref: 'TgUser' }],
  status: { type: String, enum: ['new', 'ongoing', 'finished'], default: 'new' },
  participants: [{ type: Schema.Types.ObjectId, ref: 'TgUser' }],
  stopType: { type: String, enum: ['time', 'count'], required: true },
  stopDate:   { type: Date },
  stopCount:  { type: Number },
  announceTemplate: { type: String },
  publishedMessageId: { type: Number }
}, {
    timestamps: true
});

export const Lot = model<ILot>('Lot', lotSchema);