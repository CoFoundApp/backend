const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const projectskill = await prismaClient.projectskill.create({ data: req.body });
      return res.status(201).json(projectskill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const projectskills = await prismaClient.projectskill.findMany();
      return res.status(200).json(projectskills);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const projectskill = await prismaClient.projectskill.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(projectskill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const projectskill = await prismaClient.projectskill.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(projectskill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.projectskill.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
