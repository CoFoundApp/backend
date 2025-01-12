import path from 'path';

export const swaggerConfig = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CoFound API',
      version: '1.0.0',
      description: 'API documentation for the Express application',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            isAdmin: {
              type: 'boolean',
            },
            email: {
              type: 'string',
            },
            lastName: {
              type: 'string',
            },
            firstName: {
              type: 'string',
            },
            password: {
              type: 'string',
            },
            phoneNumber: {
              type: 'integer',
            },
            username: {
              type: 'string',
            },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            lastName: {
              type: 'string',
            },
            firstName: {
              type: 'string',
            },
            username: {
              type: 'string',
            },
          },
        }
      }
    },
  },
  // Only include controllers for generating API paths
  apis: [path.join(__dirname, '../controllers/*.ts')],
};
