import { Message } from 'telegraf/typings/core/types/typegram';

export function isTextMessage(msg: unknown): msg is Message.TextMessage {
    return typeof msg === 'object' && msg !== null && 'text' in msg;
}