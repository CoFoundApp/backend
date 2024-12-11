const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const skill = await prismaClient.skill.create({ data: req.body });
      return res.status(201).json(skill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const skills = await prismaClient.skill.findMany();
      return res.status(200).json(skills);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const skill = await prismaClient.skill.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(skill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const skill = await prismaClient.skill.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(skill);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.skill.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
