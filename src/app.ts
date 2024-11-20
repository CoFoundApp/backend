import express, { Application, Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import userRoutes from './routes/user.route';
import { errorHandler } from './middlewares/erroHandler.middleware';
// import projectRoutes from './routes/project.routes';

const app: Application = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/users', userRoutes);
// app.use('/api/projects', projectRoutes);

app.use(errorHandler);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

export default app;
