import Anthropic from '@anthropic-ai/sdk';
import prisma from '../../config/database';
import { logger } from '../../config/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IntegrationContext {
  integrationId: string;
  documentationUrls?: string[];
  uploadedFiles?: Array<{
    filename: string;
    content: string;
    mimeType: string;
  }>;
}

export class ClaudeService {
  private client: Anthropic;
  private model = 'claude-sonnet-4-20250514'; // Claude Sonnet 4.5

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Send a chat message to Claude and get integration configuration assistance
   */
  async chat(
    integrationId: string,
    userMessage: string,
    context?: IntegrationContext
  ): Promise<{ response: string; configSuggestion?: any }> {
    try {
      // Load integration and chat history
      const integration = await prisma.aIIntegration.findUnique({
        where: { id: integrationId },
        include: {
          chatMessages: {
            orderBy: { createdAt: 'asc' },
          },
          uploadedFiles: true,
        },
      });

      if (!integration) {
        throw new Error('Integration not found');
      }

      // Build conversation history
      const messages = this.buildMessages(integration, userMessage, context);

      // System prompt for integration assistance
      const systemPrompt = this.buildSystemPrompt(integration, context);

      logger.info('Sending request to Claude API', {
        integrationId,
        messageCount: messages.length,
      });

      // Call Claude API
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages as any,
      });

      const assistantMessage = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Save messages to database
      await this.saveMessages(integrationId, userMessage, assistantMessage);

      // Try to extract configuration from response
      const configSuggestion = this.extractConfig(assistantMessage);

      logger.info('Claude response received', {
        integrationId,
        hasConfig: !!configSuggestion,
      });

      return {
        response: assistantMessage,
        configSuggestion,
      };
    } catch (error: any) {
      logger.error('Error calling Claude API', {
        integrationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Build the system prompt with context about what we're trying to achieve
   */
  private buildSystemPrompt(integration: any, context?: IntegrationContext): string {
    let prompt = `Du er en venlig og tålmodig assistent der hjælper en person med at sætte en integration op mellem to systemer.

**MEGET VIGTIGT - Om brugeren:**
Brugeren har INGEN erfaring med programmering eller tekniske systemer. Du skal kommunikere som om du taler med en person der aldrig har arbejdet med API'er, JSON, endpoints eller lignende tekniske begreber før.

**Integration navn:** ${integration.name}
**Type:** ${integration.integrationType}
**Mål system:** ${integration.targetSystem || 'Ikke angivet'}
${integration.description ? `**Beskrivelse:** ${integration.description}` : ''}

**Sådan kommunikerer du:**

1. **Undgå teknisk jargon** - Brug dagligdags sprog
   ❌ FORKERT: "Hvilket endpoint skal vi kalde for at hente data?"
   ✅ RIGTIGT: "Hvilken adresse/URL bruger I til at hente medarbejderdata fra systemet?"

2. **Forklar tekniske ord med simple analogier**
   - API = "En måde for systemer at tale sammen - ligesom en telefonsamtale mellem to computere"
   - Endpoint = "En specifik adresse hvor man kan hente data - som en fysisk adresse på et kontor"
   - JSON = "En måde at organisere data på - som en Excel-fil, bare i tekst-format"

3. **Stil ÉT spørgsmål ad gangen** - Max 2-3 spørgsmål per besked
   ❌ FORKERT: At stille 10 tekniske spørgsmål på én gang
   ✅ RIGTIGT: Stil 1-2 simple spørgsmål, vent på svar, så næste spørgsmål

4. **Giv konkrete eksempler**
   ❌ FORKERT: "Hvad er strukturen på dit API response?"
   ✅ RIGTIGT: "Når du henter data fra systemet, hvordan ser det ud? F.eks. kan du prøve at kopiere et par linjer fra systemet her?"

5. **Vær opmuntrende og ros fremskridt**
   - "Perfekt! Det hjælper rigtig meget"
   - "Godt! Nu mangler vi kun..."
   - "Super, det er præcis den information jeg skulle bruge"

**Dit mål:**
1. Forstå hvilket system brugeren vil forbinde til
2. Find ud af hvilke data der skal hentes (medarbejdere, tidsposter, osv.)
3. Hjælp brugeren med at finde den rigtige adresse/URL til data
4. Bed om et eksempel på hvordan data ser ud
5. Når du har nok information, generer en konfiguration

**Når du genererer konfiguration:**
- Forklar hvad konfigurationen gør i simple ord
- Vis konfigurationen i JSON format
- Konfigurationen skal følge dette format:

\`\`\`json
{
  "source": {
    "method": "GET",
    "url": "https://api.example.com/timeentries",
    "auth": {
      "type": "API_KEY",
      "header": "X-API-Key"
    },
    "queryParams": {
      "startDate": "{{startDate}}",
      "endDate": "{{endDate}}"
    },
    "dataPath": "data.entries"
  },
  "fieldMapping": {
    "employeeNumber": "employee.id",
    "startTime": "checkin_time",
    "endTime": "checkout_time",
    "location": "site_name"
  },
  "transformation": {
    "startTime": { "type": "parseISO8601" },
    "endTime": { "type": "parseISO8601" }
  },
  "validation": {
    "required": ["employeeNumber", "startTime", "endTime"],
    "rules": {
      "employeeNumber": { "type": "string", "required": true },
      "startTime": { "type": "date", "required": true },
      "endTime": { "type": "date", "required": true }
    }
  },
  "targetEntity": "TimeEntry"
}
\`\`\`

**Understøttede transformationer:**
(Forklar disse når det bliver relevant, ikke i starten)
- parseISO8601, parseDate, parseInt, parseFloat
- toUpperCase, toLowerCase, trim
- multiply (with value parameter)

**Understøttede validerings typer:**
- string, number, boolean, date, email

**HUSK:**
- Brugeren er en total nybegynder - 0 erfaring med udvikling
- Brug simple ord og forklaringer
- Stil max 1-3 spørgsmål ad gangen
- Giv masser af eksempler
- Vær tålmodig og opmuntrende
- Ros selv små fremskridt

Svar på dansk og vær venlig og hjælpsom.`;

    // Add documentation URLs if provided
    if (context?.documentationUrls && context.documentationUrls.length > 0) {
      prompt += `\n\n**Dokumentation links:**\n${context.documentationUrls.map(url => `- ${url}`).join('\n')}`;
    }

    // Add file information if provided
    if (context?.uploadedFiles && context.uploadedFiles.length > 0) {
      prompt += `\n\n**Uploadede filer:**\n${context.uploadedFiles.map(f => `- ${f.filename} (${f.mimeType})`).join('\n')}`;
    }

    return prompt;
  }

  /**
   * Build message array for Claude API
   */
  private buildMessages(
    integration: any,
    currentMessage: string,
    context?: IntegrationContext
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // Add previous chat history
    for (const msg of integration.chatMessages) {
      messages.push({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content,
      });
    }

    // Add current user message with file content if available
    let userContent = currentMessage;

    if (context?.uploadedFiles && context.uploadedFiles.length > 0) {
      userContent += '\n\n**Fil indhold:**\n';
      for (const file of context.uploadedFiles) {
        userContent += `\n--- ${file.filename} ---\n${file.content}\n`;
      }
    }

    messages.push({
      role: 'user',
      content: userContent,
    });

    return messages;
  }

  /**
   * Save chat messages to database
   */
  private async saveMessages(
    integrationId: string,
    userMessage: string,
    assistantMessage: string
  ): Promise<void> {
    await prisma.integrationChatMessage.createMany({
      data: [
        {
          integrationId,
          role: 'USER',
          content: userMessage,
        },
        {
          integrationId,
          role: 'ASSISTANT',
          content: assistantMessage,
        },
      ],
    });
  }

  /**
   * Try to extract JSON configuration from Claude's response
   */
  private extractConfig(message: string): any | null {
    try {
      // Look for JSON code blocks
      const jsonMatch = message.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to find any JSON object
      const objectMatch = message.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }

      return null;
    } catch (error) {
      logger.debug('Could not extract config from message');
      return null;
    }
  }

  /**
   * Generate initial integration configuration based on user input
   * This can be called to kickstart the conversation with specific context
   */
  async generateInitialConfig(
    integrationId: string,
    apiDocumentation: string,
    targetEntity: string = 'TimeEntry'
  ): Promise<any> {
    const initialPrompt = `
Jeg vil gerne sætte en integration op til at importere data til ${targetEntity}.

Her er API dokumentationen:

${apiDocumentation}

Kan du hjælpe mig med at lave en konfiguration?
`;

    const result = await this.chat(integrationId, initialPrompt);
    return result.configSuggestion;
  }
}
