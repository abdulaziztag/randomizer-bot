import { Schema, model } from 'mongoose';
import { IUser} from "../../interfaces/IUser";

const userSchema = new Schema<IUser>({
  telegramId: { type: Number, required: true, unique: true },
  first_name: { type: String, required: true },
  username: { type: String },
  lots: [{ type: Schema.Types.ObjectId, ref: 'Lot' }],
  channels: [{ type: Schema.Types.ObjectId, ref: 'Channel' }],
}, {
    timestamps: true
});

export const User = model<IUser>('User', userSchema);