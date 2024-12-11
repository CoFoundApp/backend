const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const notification = await prismaClient.notification.create({ data: req.body });
      return res.status(201).json(notification);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const notifications = await prismaClient.notification.findMany();
      return res.status(200).json(notifications);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const notification = await prismaClient.notification.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(notification);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const notification = await prismaClient.notification.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(notification);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.notification.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
