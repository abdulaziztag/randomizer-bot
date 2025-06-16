import { Schema, model } from 'mongoose';
import {IHoldingByTimeLot} from "../../interfaces/IHoldingByTimeLot";

const holdingByTimeLot = new Schema<IHoldingByTimeLot>({
  _id: { type: Schema.Types.ObjectId, ref: 'Lot' },
  time: { type: Date, required: true },
}, {
  timestamps: true
});

export const HoldingByTimeLot = model<IHoldingByTimeLot>('HoldingByTimeLot', holdingByTimeLot);