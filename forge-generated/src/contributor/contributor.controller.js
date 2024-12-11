const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const contributor = await prismaClient.contributor.create({ data: req.body });
      return res.status(201).json(contributor);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const contributors = await prismaClient.contributor.findMany();
      return res.status(200).json(contributors);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const contributor = await prismaClient.contributor.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(contributor);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const contributor = await prismaClient.contributor.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(contributor);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.contributor.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
