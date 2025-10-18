import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lønberegning System API',
      version: '1.0.0',
      description: `
# Transport- og Logistikoverenskomst 2025-2028 API

Automatisk løn- og tidsregistreringssystem baseret på overenskomstregler for transport- og lagermedarbejdere.

## Funktionalitet

Denne API understøtter:
- **Tidsregistrering** med komplekse arbejdstidsregler
- **Automatisk lønberegning** baseret på DIO I (ATL) og 3F's Transportgruppe overenskomst
- **Specialoverenskomster**: Chauffør, Lager/Terminal, Flyttearbejde, Grænseoverskridende, Dagrenovation, Holddrift, Lærlinge
- **Fridage og fravær**: Ferie, sygdom, barsel, børneomsorgsdage
- **Pension og opsparing**: Automatisk beregning af pension, feriepenge, særlig opsparing
- **Compliance**: Validering mod overenskomstens §§ og arbejdstidsdirektiver

## Overenskomst Referencer

Alle beregninger er baseret på Transport- og Logistikoverenskomsten 2025-2028:
- § 2: Løn og tillæg
- § 4: Arbejdstid
- § 6: Grundløn
- § 7: Overarbejde
- § 8: Særligt løntillæg/opsparing
- § 9: Pension
- § 11: Fridage
- § 12-13: Ferie
- § 14: Sygeløn
- § 15: Barsel
- § 16-17: Børns sygdom
- § 21-22: Opsigelse og fratrædelsesgodtgørelse
- § 23: Kompetenceudvikling

## Eksternt Integrerbar

Alle endpoints er designet til at modtage data fra eksterne systemer:
- CRM systemer kan sende tidsregistreringer
- Telematik systemer kan synkronisere GPS/takograf data
- Lønsystemer kan hente beregnede lønkomponenter
- HR systemer kan administrere medarbejdere
      `.trim(),
      contact: {
        name: 'API Support',
        email: 'support@lonberegning.dk',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://lonberegning-system.herokuapp.com/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token fra /auth/login endpoint',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Fejlbesked',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
              },
              description: 'Detaljerede fejlinformationer',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Login og bruger-autentificering',
      },
      {
        name: 'Employees',
        description: 'Medarbejderstyring - inkl. anciennitet, jobkategori, overenskomsttype',
      },
      {
        name: 'Time Entries',
        description: 'Tidsregistrering - kan modtages fra eksterne systemer (CRM, telematik, mobilapp)',
      },
      {
        name: 'Payroll',
        description: 'Lønberegninger baseret på overenskomst - eksport til lønsystemer',
      },
      {
        name: 'Agreements',
        description: 'Overenskomster og regler (Transport- og Logistikoverenskomsten 2025-2028)',
      },
      {
        name: 'Dashboard',
        description: 'Statistik og overblik',
      },
      {
        name: 'Export',
        description: 'Integration til lønsystemer (e-conomic, Danløn, ProLøn, etc.)',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Filer der skal scannes for Swagger kommentarer
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Lønberegning System API Docs',
  }));

  // Serve raw OpenAPI spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 Swagger documentation available at /api-docs');
};

export default specs;
