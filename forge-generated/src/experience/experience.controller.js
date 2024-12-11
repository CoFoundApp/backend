const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const experience = await prismaClient.experience.create({ data: req.body });
      return res.status(201).json(experience);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const experiences = await prismaClient.experience.findMany();
      return res.status(200).json(experiences);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const experience = await prismaClient.experience.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(experience);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const experience = await prismaClient.experience.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(experience);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.experience.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
