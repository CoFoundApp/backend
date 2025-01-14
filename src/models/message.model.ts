export class Message {
    id: number;
    receiverUserId: number;
    sentDate: Date;
    message: string;
    senderUserId: number;
    seenDate: Date | null;
    
    constructor(id: number, receiverUserId: number, sentDate: Date, message: string, senderUserId: number, seenDate: Date | null = null) {
        this.id = id;
        this.receiverUserId = receiverUserId;
        this.sentDate = sentDate;
        this.message = message;
        this.senderUserId = senderUserId;
        this.seenDate = seenDate;
    }
  }

  export class Conversation {
    receiverUserId: number;
    senderUserId: number;
    message: string;
    sentDate: Date;

    constructor(message : Message){
      this.receiverUserId = message.receiverUserId;
      this.senderUserId = message.senderUserId;
      this.message = message.message;
      this.sentDate = message.sentDate;
    }
  }