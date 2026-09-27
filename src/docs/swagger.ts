import { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';

export function setupSwagger(app: Application) {
  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.json(openApiDocument);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'LeanBloom API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    })
  );
}
