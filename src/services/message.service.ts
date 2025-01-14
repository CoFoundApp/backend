import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { Message } from '../models/message.model';
import { Conversation } from '../models/message.model';

const prisma = new PrismaClient();

export class MessageService {
  async createMessage(message: Message): Promise<Message | null> {
    try {
      const messageCreated = await prisma.messages.create({
        data: {
          receiverUserId: message.receiverUserId,
          sentDate: message.sentDate,
          message: message.message,
          senderUserId: message.senderUserId,
          seenDate: message.seenDate,
        },
      });
      if (!messageCreated) {
        return null;
      }
      return messageCreated;
    } catch (error) {
      logger(`Error in createMessage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getMessagesByUsers(receiverUserId: number, senderUserId: number): Promise<Message[]> {
    try {
      const messages = await prisma.messages.findMany({
        where: {
          receiverUserId: receiverUserId,
          senderUserId: senderUserId,
        },
      });

      const messagesBack = await prisma.messages.findMany({
        where: {
          receiverUserId: senderUserId,
          senderUserId: receiverUserId,
        },
      });

      const allMessages = [...messages, ...messagesBack];
      if (!allMessages.length) {
        return [];
      }

      return allMessages
        .map(
          (message) =>
            new Message(
              message.id,
              message.receiverUserId,
              message.sentDate,
              message.message,
              message.senderUserId,
              message.seenDate
            )
        )
        .sort((a, b) => a.sentDate.getTime() - b.sentDate.getTime());
    } catch (error) {
      logger(`Error in getMessagesByUsers: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getConversationsByUser(userId: number): Promise<Conversation[]> {
    try {
      // Fetch messages where the user is the sender or receiver
      const messages = await prisma.messages.findMany({
        where: {
          OR: [
            { senderUserId: userId },
            { receiverUserId: userId },
          ],
        },
      });

      if (!messages.length) {
        return [];
      }

      // Reduce messages into unique conversations
      const conversations = messages.reduce((acc: Conversation[], message) => {
        const existingConversation = acc.find((conversation) =>
          (conversation.receiverUserId === message.receiverUserId &&
            conversation.senderUserId === message.senderUserId) ||
          (conversation.receiverUserId === message.senderUserId &&
            conversation.senderUserId === message.receiverUserId)
        );
        if (existingConversation) {
          if (existingConversation.sentDate < message.sentDate) {
            existingConversation.sentDate = message.sentDate;
            existingConversation.message = message.message;
          }
        } else {
          acc.push(new Conversation(message));
        }
        return acc;
      }, []);

      return conversations.sort((a, b) => b.sentDate.getTime() - a.sentDate.getTime());
    } catch (error) {
      logger(`Error in getConversationsByUser: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }


  async updateMessageSeen(messageId: number): Promise<Message | null> {
    try {
      const messageToUpdate = await prisma.messages.findUnique({
        where: {
          id: messageId,
        },
      });
      if (!messageToUpdate) {
        return null;
      }
      if(messageToUpdate.seenDate){
        return new Message(
          messageToUpdate.id,
          messageToUpdate.receiverUserId,
          messageToUpdate.sentDate,
          messageToUpdate.message,
          messageToUpdate.senderUserId,
          messageToUpdate.seenDate
        );
      }
      const messageUpdated = await prisma.messages.update({
        where: {
          id: messageId,
        },
        data: {
          seenDate: new Date(),
        },
      });
      return new Message(
        messageUpdated.id,
        messageUpdated.receiverUserId,
        messageUpdated.sentDate,
        messageUpdated.message,
        messageUpdated.senderUserId,
        messageUpdated.seenDate
      );
    } catch (error) {
      logger(`Error in updateMessageSeen: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
