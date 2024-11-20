export interface Messages {
    id: bigint;
    receiverUserId: bigint;
    sentDate: Date;
    message: string;
    senderUserId: bigint;
    seenDate?: Date;
  }