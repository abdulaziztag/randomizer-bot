export const commandsList = ['/start', '/new_lot', '/my_lots', '/my_channels']

export type TCommand = (typeof commandsList)[number];