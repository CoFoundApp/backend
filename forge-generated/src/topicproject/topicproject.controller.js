const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const topicproject = await prismaClient.topicproject.create({ data: req.body });
      return res.status(201).json(topicproject);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const topicprojects = await prismaClient.topicproject.findMany();
      return res.status(200).json(topicprojects);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const topicproject = await prismaClient.topicproject.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(topicproject);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const topicproject = await prismaClient.topicproject.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(topicproject);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.topicproject.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
