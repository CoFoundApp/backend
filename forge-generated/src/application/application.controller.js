const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const application = await prismaClient.application.create({ data: req.body });
      return res.status(201).json(application);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const applications = await prismaClient.application.findMany();
      return res.status(200).json(applications);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const application = await prismaClient.application.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(application);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const application = await prismaClient.application.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(application);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.application.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
