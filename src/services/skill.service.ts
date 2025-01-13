// skill service
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { Skill } from '../models/skill.model';

const prisma = new PrismaClient();

export class SkillService {
  async getAllSkills(): Promise<Skill[]> {
    try {
      const skills = await prisma.skill.findMany();
      if (!skills.length) {
        return [];
      }
      return skills.map((skill) => new Skill(
        skill.id,
        skill.name
      ));
    } catch (error) {
      logger(`Error in getAllSkills: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  async getSkillByParams(params: { id: number }): Promise<Skill | null> {
    try {
      const skill = await prisma.skill.findUnique({
        where: { id: Number(params.id) },
      });
      if (!skill) {
        return null;
      }
      return new Skill(
        skill.id,
        skill.name
      );
    } catch (error) {
      logger(`Error in getSkillByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async createSkill(data: Omit<Skill, 'id'>): Promise<Skill | null> {
    try {
      const skill = await prisma.skill.create({
        data: {
          ...data,
        },
      });
      return new Skill(
        skill.id,
        skill.name
      );
    } catch (error) {
      logger(`Error in createSkill: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async updateSkill(params: { id: number }, data: Omit<Skill, 'id'>): Promise<Skill | null> {
    try {
      const skill = await prisma.skill.update({
        where: { id: Number(params.id) },
        data: {
          ...data,
        },
      });
      return new Skill(
        skill.id,
        skill.name
      );
    } catch (error) {
      logger(`Error in updateSkill: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async deleteSkillByParams(params: { id: number }): Promise<boolean> {
    try {
      await prisma.skill.delete({
        where: { id: Number(params.id) },
      });
      return true;
    } catch (error) {
      logger(`Error in deleteSkillByParams: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  async deleteAllSkills(): Promise<boolean> {
    try {
      await prisma.skill.deleteMany();
      return true;
    } catch (error) {
      logger(`Error in deleteAllSkills: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }
}