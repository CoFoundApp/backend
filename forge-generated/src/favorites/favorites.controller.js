const prisma = require('@prisma/client');
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

module.exports = {
  async create(req, res) {
    try {
      const favorites = await prismaClient.favorites.create({ data: req.body });
      return res.status(201).json(favorites);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getAll(req, res) {
    try {
      const favoritess = await prismaClient.favorites.findMany();
      return res.status(200).json(favoritess);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async getOne(req, res) {
    try {
      const favorites = await prismaClient.favorites.findUnique({ where: { id: parseInt(req.params.id) } });
      return res.status(200).json(favorites);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async update(req, res) {
    try {
      const favorites = await prismaClient.favorites.update({ where: { id: parseInt(req.params.id) }, data: req.body });
      return res.status(200).json(favorites);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
  async delete(req, res) {
    try {
      await prismaClient.favorites.delete({ where: { id: parseInt(req.params.id) } });
      return res.status(204).send();
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
};
