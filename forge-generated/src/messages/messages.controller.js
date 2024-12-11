const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const messages = await prismaClient.messages.create({ data: req.body });
      return res.status(201).json(messages);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const messagess = await prismaClient.messages.findMany();
      return res.status(200).json(messagess);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const messages = await prismaClient.messages.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(messages);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const messages = await prismaClient.messages.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(messages);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.messages.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
