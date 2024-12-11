import { PORT } from './config/env';
import app from './app';
import prisma from './prisma/client';

import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Connected to the database');

    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'CoFound',
          version: '1.0.0',
          description: 'CoFound API',
        },
        servers: [
          {
            url: `http://localhost:${PORT}`,
          },
        ],
      },
      apis: ['./routes/*.ts'], // Définissez le chemin de vos routes
    };

    const swaggerDocs = swaggerJsDoc(swaggerOptions);
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
