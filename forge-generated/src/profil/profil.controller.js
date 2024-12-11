const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const profil = await prismaClient.profil.create({ data: req.body });
      return res.status(201).json(profil);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const profils = await prismaClient.profil.findMany();
      return res.status(200).json(profils);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const profil = await prismaClient.profil.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(profil);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const profil = await prismaClient.profil.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(profil);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.profil.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
