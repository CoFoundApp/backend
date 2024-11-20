import { PORT } from './config/env';
import app from './app';
import prisma from './prisma/client';

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Connected to the database');

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
