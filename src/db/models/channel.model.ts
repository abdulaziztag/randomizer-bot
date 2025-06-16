import { Schema, model } from 'mongoose';
import {ChannelTypes, IChannel} from '../../interfaces/IChannel';

const channelSchema = new Schema<IChannel>({
  telegramId: { type: Number, required: true, unique: true },
  title: { type: String },
  username: { type: String },
  type: { type: String, enum: ChannelTypes, required: true },
  addedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

export const Channel = model<IChannel>('Channel', channelSchema);