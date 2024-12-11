const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const topic = await prismaClient.topic.create({ data: req.body });
      return res.status(201).json(topic);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const topics = await prismaClient.topic.findMany();
      return res.status(200).json(topics);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const topic = await prismaClient.topic.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(topic);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const topic = await prismaClient.topic.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(topic);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.topic.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
