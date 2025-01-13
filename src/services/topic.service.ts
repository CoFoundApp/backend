// topic service
import { Topic } from '../models/topic.model';
import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class TopicService {

  async getAllTopics(): Promise<Topic[]> {
    try {
      const topics = await prisma.topic.findMany();
      if (!topics.length) {
        return [];
      }
      return topics.map((topic) => new Topic(topic.id, topic.name));
    } catch (error) {
      logger(`Error in getAllTopics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getTopicByParams(params: { id: number }): Promise<Topic | null> {
    try {
      const topic = await prisma.topic.findUnique({
        where: { id: params.id },
      });
      if (!topic) {
        return null;
      }
      return new Topic(topic.id, topic.name);
    } catch (error) {
      logger(`Error in getTopicByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async createTopic(data: Omit<Topic, 'id'>): Promise<Topic | null> {
    try {
      const topic = await prisma.topic.create({ data: data as Prisma.TopicCreateInput });
      return new Topic(topic.id, topic.name);
    } catch (error) {
      logger(`Error in createTopic: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async updateTopicByParams(
    params: { id: number },
    data: Partial<Topic>
  ): Promise<Topic | null> {
    try {
      const topic = await prisma.topic.update({
        where: { id: params.id },
        data: data as Prisma.TopicUpdateInput,
      });
      return new Topic(topic.id, topic.name);
    } catch (error) {
      logger(`Error in updateTopicByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async deleteAllTopics(): Promise<number> {
    try {
      const deletedTopics = await prisma.topic.deleteMany();
      const topics = await prisma.topic.findMany();
      if (topics.length) {
        return 0;
      }
      return deletedTopics.count;
    } catch (error) {
      logger(`Error in deleteAllTopics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  async deleteTopicByParams(params: { id: number }): Promise<number> {
    try {
      // Check if the topic exists before attempting to delete it
      const topic = await prisma.topic.findUnique({
        where: { id: params.id },
      });

      if (!topic) {
        logger(`Topic with ID ${params.id} does not exist.`);
        return 0; // Indicate failure to delete due to non-existence
      }

      // Proceed with deletion
      const deletedTopic = await prisma.topic.delete({
        where: { id: params.id },
      });

      logger(`Successfully deleted topic with ID ${deletedTopic.id}`);
      return deletedTopic.id;
    } catch (error) {
      logger(`Error in deleteTopicByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0; // Indicate failure due to an error
    }
  }

}