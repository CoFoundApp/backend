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
        },
        Profile: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            notifEmail: {
              type: 'boolean',
            },
            notifPhone: {
              type: 'boolean',
            },
            availability: {
              type: 'string',
            },
            location: {
              type: 'string',
            },
            userId: {
              type: 'integer',
            },
            topicId: {
              type: 'integer',
            },
            notifPush: {
              type: 'boolean',
            },
          },
        },
        ProfileResponse: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            availability: {
              type: 'string',
            },
            location: {
              type: 'string',
            },
            userId: {
              type: 'integer',
            },
          },
        },
        Topic: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            title: {
              type: 'string',
            },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            userId: {
              type: 'integer',
            },
            emitterProjectId: {
              type: 'integer',
            },
            emitterUserId: {
              type: 'integer',
            },
            link: {
              type: 'string',
            },
            seen: {
              type: 'boolean',
            },
            description: {
              type: 'string',
            },
            emissionDate: {
              type: 'string',
            },
          },
        },
        Skill: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            name: {
              type: 'string',
            },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            userId: {
              type: 'integer',
            },
            endingDate: {
              type: 'string',
            },
            startingDate: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
          },
        },
      }
    },
  },
  // Only include controllers for generating API paths
  apis: [path.join(__dirname, '../controllers/*.ts')],
};
