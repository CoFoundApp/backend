const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const experienceskill = await prismaClient.experienceskill.create({ data: req.body });
      return res.status(201).json(experienceskill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const experienceskills = await prismaClient.experienceskill.findMany();
      return res.status(200).json(experienceskills);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const experienceskill = await prismaClient.experienceskill.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(experienceskill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const experienceskill = await prismaClient.experienceskill.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(experienceskill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.experienceskill.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
