import { Scenes } from 'telegraf';
import { addChannelScene } from './addChannelScene';
import { createLotScene } from './createLotScene';


// @ts-ignore
export const stage = new Scenes.Stage([addChannelScene, createLotScene]);