import {Types} from "mongoose";

export interface IHoldingByTimeLot {
  _id: Types.ObjectId;
  time: Date;
}