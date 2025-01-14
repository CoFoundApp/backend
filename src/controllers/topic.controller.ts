import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { TopicService } from '../services/topic.service';
import { validateTopic } from '../validators/topic.validator';

const topicService = new TopicService();

/**
 * @swagger
 * tags:
 *   name: Topics
 *   description: API for managing topics
 */
export class TopicController {
  /**
   * @swagger
   * /api/topics:
   *   get:
   *     summary: Retrieve all topics
   *     tags: [Topics]
   *     responses:
   *       200:
   *         description: A list of topics
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Topic'
   *       404:
   *         description: No topics found
   *       500:
   *         description: Internal Server Error
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const topics = await topicService.getAllTopics();
      if (!topics.length) {
        res.status(404).json({ message: 'No topics found' });
        return;
      }
      res.status(200).json(topics);
    } catch (error) {
      logger(`Error in getAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/topics/{id}:
   *   get:
   *     summary: Get topic by ID
   *     tags: [Topics]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Topic ID
   *     responses:
   *       200:
   *         description: A topic object
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Topic'
   *       404:
   *         description: Topic not found
   *       500:
   *         description: Internal Server Error
   */
  async getByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return;
      }
      const topic = await topicService.getTopicByParams({ id });
      if (!topic) {
        res.status(404).json({ message: 'Topic not found' });
        return;
      }
      res.status(200).json(topic);
    } catch (error) {
      logger(`Error in getByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/topics:
   *   post:
   *     summary: Create a new topic
   *     tags: [Topics]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Topic'
   *     responses:
   *       201:
   *         description: Topic created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Topic'
   *       400:
   *         description: Failed to create topic
   *       500:
   *         description: Internal Server Error
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      validateTopic(req, res, () => {
      }); // Validation middleware
      const newTopic = await topicService.createTopic(req.body);
      if (!newTopic) {
        res.status(400).json({ message: 'Failed to create topic' });
        return;
      }
      res.status(201).json(newTopic);
    } catch (error) {
      logger(`Error in create: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/topics/{id}:
   *   put:
   *     summary: Update a topic by ID
   *     tags: [Topics]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Topic ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/Topic'
   *     responses:
   *       200:
   *         description: Topic updated
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Topic'
   *       400:
   *         description: Failed to update topic
   *       500:
   *         description: Internal Server Error
   */
  async updateByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return;
      }
      const topicToUpdate = await topicService.getTopicByParams({ id });
      if (!topicToUpdate) {
        res.status(404).json({ message: 'Topic not found' });
        return;
      }
      validateTopic(req, res, () => {
      }); // Validation middleware
      const updatedTopic = await topicService.updateTopicByParams({ id }, req.body);
      if (!updatedTopic) {
        res.status(400).json({ message: 'Failed to update topic' });
        return;
      }
      res.status(200).json(updatedTopic);
    } catch (error) {
      logger(`Error in updateByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/topics:
   *   delete:
   *     summary: Delete all topics
   *     tags: [Topics]
   *     responses:
   *       200:
   *         description: Topics deleted
   *       500:
   *         description: Internal Server Error
   */
  async deleteAll(req: Request, res: Response): Promise<void> {
    try {
      const deletedTopics = await topicService.deleteAllTopics();
      if (!deletedTopics) {
        res.status(404).json({ message: 'No topics found' });
        return;
      }
      res.status(200).json({ message: 'Topics deleted' });
    } catch (error) {
      logger(`Error in deleteAll: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/topics/{id}:
   *   delete:
   *     summary: Delete topic by ID
   *     tags: [Topics]
   *     parameters:
   *       - in: path
   *         name: id
   *         schema:
   *           type: integer
   *         required: true
   *         description: Topic ID
   *     responses:
   *       200:
   *         description: Topic deleted
   *       404:
   *         description: Topic not found
   *       500:
   *         description: Internal Server Error
   */
  async deleteByParams(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid ID format' });
        return;
      }
      const deletedTopic = await topicService.deleteTopicByParams({ id });
      if (!deletedTopic) {
        res.status(404).json({ message: 'Topic not found' });
        return;
      }
      res.status(200).json({ message: 'Topic deleted' });
    } catch (error) {
      logger(`Error in deleteByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
}