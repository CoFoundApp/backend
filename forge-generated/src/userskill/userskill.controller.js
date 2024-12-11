const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const userskill = await prismaClient.userskill.create({ data: req.body });
      return res.status(201).json(userskill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const userskills = await prismaClient.userskill.findMany();
      return res.status(200).json(userskills);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const userskill = await prismaClient.userskill.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(userskill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const userskill = await prismaClient.userskill.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(userskill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.userskill.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
