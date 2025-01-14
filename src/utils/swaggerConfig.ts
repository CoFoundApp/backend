import path from 'path';

export const swaggerConfig = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CoFound API',
      version: '1.0.0',
      description: 'API documentation of the CoFound project',
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
        Contributor: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            endingDate: {
              type: 'string',
            },
            role: {
              type: 'string',
            },
            projectId: {
              type: 'integer',
            },
            mission: {
              type: 'string',
            },
            userId: {
              type: 'integer',
            },
            startingDate: {
              type: 'string',
            },
          },
        },
        Experience: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            userId: {
              type: 'integer',
            },
            description: {
              type: 'string',
            },
            endingDate: {
              type: 'string',
            },
            startingDate: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            location: {
              type: 'string',
            },
            role: {
              type: 'string',
            },
            mission: {
              type: 'string',
            }
          },
        },
        Application: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
            },
            isRefused: {
              type: 'boolean',
            },
            isAccepted: {
              type: 'boolean',
            },
            description: {
              type: 'string',
            },
            userId: {
              type: 'integer',
            },
            projectId: {
              type: 'integer',
            },
          },
        },
        FavoritesByUser: {
          type: 'object',
          properties: {
            userId: {
              type: 'integer',
            },
            projects: {
              type: 'array',
              items: {
                type: 'integer',
              },
            },
          },
        },
        FavoritesByProject: {
          type: 'object',
          properties: {
            projectId: {
              type: 'integer',
            },
            users: {
              type: 'array',
              items: {
                type: 'integer',
              },
            },
          },
        },
        Favorite: {
          type: 'object',
          properties: {
            projectId: {
              type: 'integer',
            },
            userId: {
              type: 'integer',
            },
          },
        }
      }
    },
  },
  apis: [path.join(__dirname, '../controllers/*.ts'),path.join(__dirname, '../controllers/*.js')],
};
