import express, { Application } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { swaggerConfig } from './utils/swaggerConfig';
import userRoutes from './routes/user.route';
import profileRoute from './routes/profile.route';
import topicRoute from './routes/topic.route';
import notificationRouter from './routes/notification.router';
import skillRoute from './routes/skill.route';
import projectRoute from './routes/project.route';

const app: Application = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger Setup
const swaggerDocs = swaggerJsDoc(swaggerConfig);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.get('/api-docs-json', (req, res) => {
  res.json(swaggerDocs);
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/profiles', profileRoute);
app.use('/api/topics', topicRoute);
app.use('/api/notifications', notificationRouter);
app.use('/api/skills', skillRoute);
app.use('/api/projects', projectRoute);

// Default route
app.get('/', (req, res) => {
  res.send('Welcome to the CoFound!');
});

// error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
    next();
  }
);

export default app;
