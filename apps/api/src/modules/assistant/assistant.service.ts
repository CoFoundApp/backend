import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Mistral } from '@mistralai/mistralai';
import { ResponseFormat } from '@mistralai/mistralai/models/components/responseformat.js';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { ProjectIdeationAssistantInput } from './dto/project-ideation.input';
import type {
  AssistantConversationMessage,
  AssistantDocumentDownload,
  AssistantElearningRecommendation,
  ProjectIdeationAssistantInputEcho,
  ProjectIdeationAssistantPayload,
  ProjectIdeationAssistantSavedRun,
} from './assistant.types';
import { ProjectIdeationAssistantStep, PROJECT_IDEATION_ASSISTANT_STEPS } from './assistant.types';
import { AppError } from '../../common/errors/app-error.factory';
import { EMBEDDING_DIM, EMBEDDING_PORT, EmbeddingPort } from '../embedding/embedding.port';
import { toVectorLiteral } from '../../common/utils/vector.util';
import type {
  ElearningCatalogEntry,
  ElearningCatalogItem,
  NormalizedProjectIdeationInput,
  ProjectIdeationDataUpdate,
  ProjectIdeationLLMResponse,
} from './assistant.interfaces';
import { buildConversationExample, buildStepQuestions } from './conversation-helpers';
import { buildDocumentationDownloads } from './documentation-downloads';
import { Role } from '../auth/role.enum';

type StoredIdeationRunRow = {
  id: string;
  user_id: string;
  cache_key: string;
  language: string;
  step: string;
  input: unknown;
  payload: unknown;
  created_at: Date;
  updated_at: Date;
};

const PROMPT_LABELS = {
  fr: {
    brief: 'Brief utilisateur',
    idea: 'Idée',
    context: 'Contexte',
    motivation: 'Motivation',
    problem: 'Problème à adresser',
    audience: 'Public pressenti',
    stage: "Niveau d'avancement",
    constraints: 'Contraintes',
    resources: 'Ressources disponibles',
    differentiator: 'Angle différenciant',
    successMetric: 'Indicateur de succès',
    modulesIntro: 'Modules e-learning disponibles',
    instructions: 'Consignes',
    owner: 'Fondateur solo',
  },
  en: {
    brief: 'User brief',
    idea: 'Idea',
    context: 'Context',
    motivation: 'Motivation',
    problem: 'Problem to solve',
    audience: 'Initial audience',
    stage: 'Stage',
    constraints: 'Constraints',
    resources: 'Available resources',
    differentiator: 'Differentiator',
    successMetric: 'Success metric',
    modulesIntro: 'Available e-learning modules',
    instructions: 'Guidelines',
    owner: 'Solo founder',
  },
} as const;

const EN_HINTS = [' the ', ' and ', ' market', 'customer', 'problem', 'solution', 'growth', 'team', 'product'];
const FR_HINTS = [' le ', ' la ', ' les ', ' marché', 'client', 'solution', 'équipe', 'produit', 'projet'];

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly schemaVersion = '2024-11-25-linear-conversation-trace';
  private readonly appName = process.env.APP_NAME ?? process.env.BRAND_NAME ?? 'CoFound';
  private readonly model = process.env.PROJECT_ASSISTANT_MODEL || 'mistral-large-latest';
  private readonly modulesCatalog: ElearningCatalogItem[];
  private readonly moduleCodes: string[];
  private readonly orderedSteps = [...PROJECT_IDEATION_ASSISTANT_STEPS, ProjectIdeationAssistantStep.All];
  private client: Mistral | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMBEDDING_PORT) private readonly embedder: EmbeddingPort,
  ) {
    const baseUrl = (process.env.APP_BASE_URL ?? process.env.BRAND_URL ?? 'https://cofound.example.com').replace(/\/$/, '');
    const rawCatalog: ElearningCatalogEntry[] = [
      {
        code: 'market-validation-sprint',
        title: {
          fr: 'Sprint Validation Marché',
          en: 'Market Validation Sprint',
        },
        description: {
          fr: 'Méthode express pour vérifier l’intérêt client via interviews et tests rapides.',
          en: 'Express method to confirm market interest through interviews and quick smoke tests.',
        },
        focus: {
          fr: 'Interviews clients, scoring problème',
          en: 'Customer interviews & problem scoring',
        },
        urlPath: '/learn/market-validation-sprint',
      },
      {
        code: 'persona-lab',
        title: {
          fr: 'Atelier Persona & JTBD',
          en: 'Persona & JTBD Lab',
        },
        description: {
          fr: 'Cadre guidé pour formaliser persona, besoins et job-to-be-done.',
          en: 'Guided framework to formalise persona, needs and job-to-be-done.',
        },
        focus: {
          fr: 'Persona, motivations, comportements',
          en: 'Persona, motivations, behaviours',
        },
        urlPath: '/learn/persona-lab',
      },
      {
        code: 'value-prop-lab',
        title: {
          fr: 'Value Proposition Bootcamp',
          en: 'Value Proposition Bootcamp',
        },
        description: {
          fr: 'Clarifie la promesse de valeur et les bénéfices différenciants.',
          en: 'Clarifies the value promise and differentiating benefits.',
        },
        focus: {
          fr: 'Proposition de valeur, message produit',
          en: 'Value proposition & messaging',
        },
        urlPath: '/learn/value-prop-lab',
      },
      {
        code: 'pitch-essentials',
        title: {
          fr: 'Pitch Essentials 60s',
          en: 'Pitch Essentials 60s',
        },
        description: {
          fr: 'Structure un pitch court orienté problème/solution/action.',
          en: 'Structure a short pitch focused on problem/solution/action.',
        },
        focus: {
          fr: 'Pitch, storytelling, call-to-action',
          en: 'Pitch, storytelling, call-to-action',
        },
        urlPath: '/learn/pitch-essentials',
      },
    ];

    this.modulesCatalog = rawCatalog.map((entry) => ({
      ...entry,
      url: `${baseUrl}${entry.urlPath}`,
    }));
    this.moduleCodes = this.modulesCatalog.map((module) => module.code);
  }

  async generateProjectIdeation(
    userId: string,
    input: ProjectIdeationAssistantInput,
    role?: Role | null,
  ): Promise<ProjectIdeationAssistantPayload> {
    if (!userId) throw AppError.unauthorized();
    const allowedSteps = await this.resolveAvailableSteps(userId, role ?? null);
    const normalized = this.normalizeInput(input);
    this.enforceStepAccess(normalized.step, allowedSteps);
    const cacheKey = this.computeCacheKey(normalized);
    const cached = await this.loadFromCache(cacheKey);
    if (cached) {
      const gatedPayload = this.applyAvailableSteps(cached, allowedSteps);
      await this.persistUserRun(userId, cacheKey, normalized, gatedPayload);
      return gatedPayload;
    }

    const session = await this.prisma.assistant_sessions.create({
      data: {
        user_id: userId,
        metadata: {
          kind: 'project_ideation',
          cacheKey,
          schemaVersion: this.schemaVersion,
          language: normalized.language,
          step: normalized.step,
        },
      },
    });
    const startedAt = Date.now();

    try {
      const llm = await this.fetchFromProvider(normalized);
      const basePayload = await this.composePayload(normalized, llm, this.orderedSteps);
      const gatedPayload = this.applyAvailableSteps(basePayload, allowedSteps);
      await this.persistCache(cacheKey, basePayload, normalized);
      await this.persistUserRun(userId, cacheKey, normalized, gatedPayload);
      await this.prisma.assistant_sessions.update({
        where: { id: session.id },
        data: {
          ended_at: new Date(),
          metadata: {
            kind: 'project_ideation',
            cacheKey,
            schemaVersion: this.schemaVersion,
            language: normalized.language,
            durationMs: Date.now() - startedAt,
            step: normalized.step,
          },
        },
      });
      return gatedPayload;
    } catch (error) {
      await this.prisma.assistant_sessions
        .update({
          where: { id: session.id },
          data: {
            ended_at: new Date(),
            metadata: {
              kind: 'project_ideation',
              cacheKey,
              schemaVersion: this.schemaVersion,
              language: normalized.language,
              step: normalized.step,
              error: (error as Error).message,
            },
          },
        })
        .catch(() => undefined);
      throw error;
    }
  }

  private async loadFromCache(cacheKey: string): Promise<ProjectIdeationAssistantPayload | null> {
    const row = await this.prisma.assistant_cache.findUnique({ where: { cache_key: cacheKey } });
    if (!row?.payload) return null;
    await this.prisma.assistant_cache
      .update({ where: { id: row.id }, data: { last_used_at: new Date() } })
      .catch(() => undefined);
    return this.ensureDocumentationDownloads(row.payload as unknown as ProjectIdeationAssistantPayload);
  }

  private async persistCache(
    cacheKey: string,
    payload: ProjectIdeationAssistantPayload,
    normalized: NormalizedProjectIdeationInput,
  ) {
    const db = this.prisma.prisma();
    const serialized = JSON.stringify(payload);
    let vectorLiteral: string | null = null;
    try {
      const vec = await this.embedder.embedText(JSON.stringify(normalized));
      if (Array.isArray(vec) && vec.length) {
        vectorLiteral = toVectorLiteral(vec, EMBEDDING_DIM);
      }
    } catch (error) {
      this.logger.warn(`Assistant cache embedding failed: ${(error as Error).message}`);
    }

    const sql = `
      INSERT INTO assistant_cache (cache_key, payload, query_embedding)
      VALUES ($1, $2::jsonb, ${vectorLiteral ? `'${vectorLiteral}'::halfvec` : 'NULL'})
      ON CONFLICT (cache_key) DO UPDATE
        SET payload = EXCLUDED.payload,
            query_embedding = COALESCE(EXCLUDED.query_embedding, assistant_cache.query_embedding),
            last_used_at = NOW()
    `;

    await db.$queryRawUnsafe(sql, cacheKey, serialized).catch((error) => {
      this.logger.warn(`Assistant cache persist failed: ${(error as Error).message}`);
    });
  }

  private async persistUserRun(
    userId: string,
    cacheKey: string,
    normalized: NormalizedProjectIdeationInput,
    payload: ProjectIdeationAssistantPayload,
  ) {
    const base: Prisma.assistant_project_ideation_runsUncheckedCreateInput = {
      user_id: userId,
      cache_key: cacheKey,
      language: normalized.language,
      step: normalized.step,
      input: normalized as unknown as Prisma.InputJsonValue,
      payload: payload as unknown as Prisma.InputJsonValue,
    };

    await this.prisma.assistant_project_ideation_runs
      .upsert({
        where: { user_id_cache_key: { user_id: userId, cache_key: cacheKey } },
        create: base,
        update: { ...base, updated_at: new Date() },
      })
      .catch((error) => {
        this.logger.warn(`Assistant run persist failed: ${(error as Error).message}`);
      });
  }

  private async fetchFromProvider(input: NormalizedProjectIdeationInput): Promise<ProjectIdeationLLMResponse> {
    const client = this.getClient();
    const systemPrompt = this.buildSystemPrompt(input.language, input.step);
    const userPrompt = this.buildUserPrompt(input);
    const responseFormat = this.buildResponseFormat(input.step, this.moduleCodes);

    try {
      const response = await client.chat.complete({
        model: this.model,
        temperature: 0.25,
        maxTokens: 2200,
        responseFormat,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });
      const content = this.extractResponseText(response);
      return this.parseResponse(content);
    } catch (error) {
      this.logger.error('Assistant provider request failed', error as Error);
      throw AppError.serviceUnavailable('assistant.requestFailed', {
        details: { message: (error as Error).message },
      });
    }
  }

  private getClient(): Mistral {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw AppError.internal('assistant.mistralKeyMissing');
    }
    if (!this.client) {
      this.client = new Mistral({ apiKey });
    }
    return this.client;
  }

  private extractResponseText(response: any): string {
    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((chunk) => {
          if (!chunk) return '';
          if (typeof chunk === 'string') return chunk;
          if (typeof chunk.text === 'string') return chunk.text;
          if (typeof chunk.content === 'string') return chunk.content;
          return '';
        })
        .join('');
    }
    return '';
  }

  private parseResponse(raw: string): ProjectIdeationLLMResponse {
    try {
      const parsed = JSON.parse(raw) as ProjectIdeationLLMResponse;
      return parsed;
    } catch (error) {
      this.logger.error('Assistant JSON parse failed', error as Error);
      throw AppError.serviceUnavailable('assistant.invalidResponse');
    }
  }

  private async composePayload(
    input: NormalizedProjectIdeationInput,
    response: ProjectIdeationLLMResponse,
    availableSteps: ProjectIdeationAssistantStep[] = this.orderedSteps,
  ): Promise<ProjectIdeationAssistantPayload> {
    const moduleMap = new Map(this.modulesCatalog.map((module) => [module.code, module]));
    const recommendations: AssistantElearningRecommendation[] | null = response.elearning?.length
      ? response.elearning.map((entry, index) => {
          const fallback = this.modulesCatalog[index % this.modulesCatalog.length];
          const module = moduleMap.get(entry.moduleCode) ?? fallback;
          return {
            moduleCode: module.code,
            title: module.title[input.language],
            description: module.description[input.language],
            url: module.url,
            reason: entry.reason,
          };
        })
      : null;

    const inputEcho = this.buildInputEcho(input);
    const stepQuestions = buildStepQuestions(input);
    const focus = this.describeStepFocus(input.step, input.language);
    const conversationTrace = this.buildConversationTrace(input.conversationHistory, response.reply);

    const guidance = response.guidance
      ? {
          nudges: response.guidance.nudges ?? [],
          segmentInsights: response.guidance.segmentInsights ?? [],
          riskAlerts: response.guidance.riskAlerts ?? [],
          suggestedNextInput: response.guidance.suggestedNextInput ?? null,
          projectSuccessStats: response.guidance.projectSuccessStats ?? null,
          marketPotential: response.guidance.marketPotential ?? null,
          appNameIdeas: response.guidance.appNameIdeas ?? [],
        }
      : null;

    const documentationDownloads = await buildDocumentationDownloads(
      input.language,
      response.documentation ?? null,
    );

    return {
      version: this.schemaVersion,
      language: input.language,
      step: input.step,
      availableSteps: [...availableSteps],
      stepQuestions,
      conversationExample: buildConversationExample(input, this.appName, focus, stepQuestions),
      conversationTrace,
      inputEcho,
      exploration: response.exploration ?? null,
      structuration: response.structuration ?? null,
      action: response.action ?? null,
      documentation: response.documentation ?? null,
      documentationDownloads: this.normalizeDownloads(documentationDownloads),
      orientation: response.orientation ?? null,
      elearning: recommendations,
      guidance,
      assistantReply: response.reply ?? null,
      dataUpdate: this.normalizeDataUpdate(response.dataUpdate ?? null),
    };
  }

  private normalizeDataUpdate(update: ProjectIdeationDataUpdate | null): ProjectIdeationAssistantPayload['dataUpdate'] {
    if (!update) return null;

    return {
      vision: update.vision ?? null,
      problems: update.problems ?? null,
      keywords: update.keywords ?? null,
      sector: update.sector ?? null,
      stats: update.stats
        ? {
            confidence: update.stats.confidence ?? null,
            completeness: update.stats.completeness ?? null,
            marketPotential: update.stats.marketPotential ?? null,
          }
        : null,
      canvas: update.canvas
        ? {
            problem: update.canvas.problem ?? null,
            solution: update.canvas.solution ?? null,
            target: update.canvas.target ?? null,
            valueProp: update.canvas.valueProp ?? null,
            diff: update.canvas.diff ?? null,
          }
        : null,
      persona: update.persona
        ? {
            name: update.persona.name ?? null,
            goal: update.persona.goal ?? null,
            pain: update.persona.pain ?? null,
            behavior: update.persona.behavior ?? null,
          }
        : null,
      hypotheses: update.hypotheses ?? null,
      pitch: update.pitch ?? null,
      quickActions: update.quickActions ?? null,
      goal30Days: update.goal30Days ?? null,
      roadmap: update.roadmap?.map((entry) => ({
        step: entry.step ?? null,
        deadline: entry.deadline ?? null,
      })) ?? null,
    };
  }

  private normalizeDownloads(
    downloads?: AssistantDocumentDownload[] | null,
  ): AssistantDocumentDownload[] | null {
    if (!downloads || downloads.length === 0) return downloads ?? null;
    return downloads.map((download) => ({
      ...download,
      encoding: download.encoding ?? 'utf8',
    }));
  }

  private async ensureDocumentationDownloads(
    payload: ProjectIdeationAssistantPayload,
  ): Promise<ProjectIdeationAssistantPayload> {
    const normalizedDownloads = this.normalizeDownloads(payload.documentationDownloads);
    const hasPdf = normalizedDownloads?.some((download) => download.mimeType === 'application/pdf');

    if (normalizedDownloads && (hasPdf || !payload.documentation)) {
      return { ...payload, documentationDownloads: normalizedDownloads };
    }

    if (payload.documentation) {
      const rebuilt = await buildDocumentationDownloads(payload.language as 'fr' | 'en', payload.documentation);
      return {
        ...payload,
        documentationDownloads: this.normalizeDownloads(rebuilt),
      };
    }

    return payload;
  }

  private buildInputEcho(input: NormalizedProjectIdeationInput): ProjectIdeationAssistantInputEcho {
    return {
      idea: input.idea,
      context: input.context ?? null,
      motivation: input.motivation ?? null,
      problem: input.problem ?? null,
      targetAudience: input.targetAudience ?? null,
      stage: input.stage ?? null,
      constraints: input.constraints ?? null,
      resources: input.resources ?? null,
      differentiator: input.differentiator ?? null,
      successMetric: input.successMetric ?? null,
    };
  }

  async listProjectIdeationRuns(
    userId: string,
    role?: Role | null,
  ): Promise<ProjectIdeationAssistantSavedRun[]> {
    if (!userId) throw AppError.unauthorized();
    const availableSteps = await this.resolveAvailableSteps(userId, role ?? null);
    const rows = await this.prisma.assistant_project_ideation_runs.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    return Promise.all(rows.map((row) => this.toSavedRun(row, availableSteps)));
  }

  async getProjectIdeationRun(
    userId: string,
    id: string,
    role?: Role | null,
  ): Promise<ProjectIdeationAssistantSavedRun | null> {
    if (!userId) throw AppError.unauthorized();
    const availableSteps = await this.resolveAvailableSteps(userId, role ?? null);
    const row = await this.prisma.assistant_project_ideation_runs.findFirst({
      where: { id, user_id: userId },
    });
    return row ? this.toSavedRun(row, availableSteps) : null;
  }

  private async toSavedRun(
    row: StoredIdeationRunRow,
    availableSteps?: ProjectIdeationAssistantStep[],
  ): Promise<ProjectIdeationAssistantSavedRun> {
    const payload = (row.payload ?? null) as ProjectIdeationAssistantPayload | null;
    const storedInput = (row.input ?? {}) as Partial<NormalizedProjectIdeationInput>;
    const payloadInput = payload?.inputEcho;

    const language = this.normalizeLanguage(storedInput.language ?? payload?.language ?? null);
    const step = this.normalizeStepValue(storedInput.step ?? payload?.step ?? null);

    const normalizedInput: NormalizedProjectIdeationInput = {
      idea: storedInput.idea ?? payloadInput?.idea ?? '',
      context: storedInput.context ?? payloadInput?.context ?? null,
      motivation: storedInput.motivation ?? payloadInput?.motivation ?? null,
      problem: storedInput.problem ?? payloadInput?.problem ?? null,
      targetAudience: storedInput.targetAudience ?? payloadInput?.targetAudience ?? null,
      stage: storedInput.stage ?? payloadInput?.stage ?? null,
      constraints: storedInput.constraints ?? payloadInput?.constraints ?? null,
      resources: storedInput.resources ?? payloadInput?.resources ?? null,
      differentiator: storedInput.differentiator ?? payloadInput?.differentiator ?? null,
      successMetric: storedInput.successMetric ?? payloadInput?.successMetric ?? null,
      language,
      step,
      conversationHistory: this.normalizeConversationHistory(
        (storedInput as Partial<NormalizedProjectIdeationInput>).conversationHistory ??
          (payload?.conversationTrace as AssistantConversationMessage[] | null) ??
          null,
      ),
    };

    const stepQuestions = buildStepQuestions(normalizedInput);
    const gatedPayload = this.applyAvailableSteps(
      payload ?? {
        version: this.schemaVersion,
        language,
        step,
        availableSteps: [...this.orderedSteps],
        stepQuestions,
        conversationExample: buildConversationExample(
          normalizedInput,
          this.appName,
          this.describeStepFocus(step, language),
          stepQuestions,
        ),
        conversationTrace: normalizedInput.conversationHistory,
        inputEcho: this.buildInputEcho(normalizedInput),
        exploration: null,
        structuration: null,
        action: null,
        documentation: null,
        documentationDownloads: null,
        orientation: null,
        elearning: null,
        guidance: null,
      },
      availableSteps ?? this.orderedSteps,
    );

    const safePayload = await this.ensureDocumentationDownloads(gatedPayload);

    return {
      id: row.id,
      step,
      language,
      inputEcho: this.buildInputEcho(normalizedInput),
      payload: safePayload,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private normalizeLanguage(language?: string | null): 'fr' | 'en' {
    return language === 'en' ? 'en' : 'fr';
  }

  private async resolveAvailableSteps(
    userId: string,
    role: Role | null,
  ): Promise<ProjectIdeationAssistantStep[]> {
    if (role === Role.admin) return [...this.orderedSteps];

    const subscription = await this.prisma.subscriptions.findFirst({
      where: { user_id: userId, status: { in: ['active', 'trialing'] } },
      orderBy: { started_at: 'desc' },
      select: { plan_code: true },
    });

    const plan = this.normalizePlan(subscription?.plan_code ?? null);
    if (plan === 'premium') return [...this.orderedSteps];
    return [ProjectIdeationAssistantStep.Exploration];
  }

  private normalizePlan(code?: string | null): 'free' | 'premium' {
    if (!code) return 'free';
    const normalized = code.trim().toLowerCase();
    const premiumPrefixes = ['pro', 'solo', 'premium', 'growth', 'team'];
    return premiumPrefixes.some((prefix) => normalized.startsWith(prefix)) ? 'premium' : 'free';
  }

  private enforceStepAccess(
    step: ProjectIdeationAssistantStep,
    allowedSteps: ProjectIdeationAssistantStep[],
  ): void {
    if (!allowedSteps.includes(step)) {
      throw AppError.forbidden('assistant.stepUnavailable');
    }
  }

  private applyAvailableSteps(
    payload: ProjectIdeationAssistantPayload,
    allowedSteps: ProjectIdeationAssistantStep[],
  ): ProjectIdeationAssistantPayload {
    return { ...payload, availableSteps: [...allowedSteps] };
  }

  private normalizeStepValue(
    step?: string | null,
    fallback: ProjectIdeationAssistantStep = ProjectIdeationAssistantStep.Exploration,
  ): ProjectIdeationAssistantStep {
    if (step === ProjectIdeationAssistantStep.All) return ProjectIdeationAssistantStep.All;
    const match = PROJECT_IDEATION_ASSISTANT_STEPS.find((value) => value === step);
    return match ?? fallback;
  }

  private normalizeInput(input: ProjectIdeationAssistantInput): NormalizedProjectIdeationInput {
    const sanitize = (value?: string | null, limit = 800) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (trimmed.length <= limit) return trimmed;
      return `${trimmed.slice(0, limit - 1)}…`;
    };

    const idea = sanitize(input.idea, 1400);
    if (!idea) {
      throw AppError.badRequest('assistant.ideaRequired');
    }

    const language = this.detectLanguage(input.language, idea, input.context, input.motivation);
    const step = this.normalizeStep(input.step);
    const conversationHistory = this.normalizeConversationHistory(input.conversationHistory);

    return {
      idea,
      context: sanitize(input.context),
      motivation: sanitize(input.motivation),
      problem: sanitize(input.problem),
      targetAudience: sanitize(input.targetAudience),
      stage: sanitize(input.stage),
      constraints: sanitize(input.constraints),
      resources: sanitize(input.resources),
      differentiator: sanitize(input.differentiator),
      successMetric: sanitize(input.successMetric),
      language,
      step,
      conversationHistory,
    };
  }

  private normalizeStep(step?: ProjectIdeationAssistantStep | null): ProjectIdeationAssistantStep {
    if (!step) return ProjectIdeationAssistantStep.Exploration;
    return step;
  }

  private detectLanguage(
    hint: string | undefined,
    idea: string,
    context?: string | null,
    motivation?: string | null,
  ): 'fr' | 'en' {
    if (hint) {
      const normalized = hint.trim().toLowerCase();
      if (normalized.startsWith('en')) return 'en';
      if (normalized.startsWith('fr')) return 'fr';
    }
    const base = `${idea} ${context ?? ''} ${motivation ?? ''}`.toLowerCase();
    const enHits = this.countHints(base, EN_HINTS);
    const frHits = this.countHints(base, FR_HINTS);
    return enHits > frHits ? 'en' : 'fr';
  }

  private countHints(text: string, hints: string[]): number {
    return hints.reduce((acc, hint) => (text.includes(hint) ? acc + 1 : acc), 0);
  }

  private renderConversationHistory(
    history: AssistantConversationMessage[],
    language: 'fr' | 'en',
  ): string[] {
    if (!history.length) return [];
    const userLabel = language === 'en' ? 'User' : 'Utilisateur';
    const assistantLabel = 'Assistant';
    return history.slice(-8).map((message) => {
      const label = message.role === 'assistant' ? assistantLabel : userLabel;
      return `${label}: ${message.content}`;
    });
  }

  private buildConversationTrace(
    history: AssistantConversationMessage[],
    assistantReply?: string | null,
  ): AssistantConversationMessage[] {
    const base = this.normalizeConversationHistory(history);
    if (assistantReply) {
      base.push({ role: 'assistant', content: assistantReply.trim().slice(0, 800) });
    }
    const limit = 20;
    return base.slice(-limit);
  }

  private normalizeConversationHistory(
    history?: AssistantConversationMessage[] | null,
  ): AssistantConversationMessage[] {
    if (!history?.length) return [];

    const limit = 14;
    const normalized = history.reduce<AssistantConversationMessage[]>((acc, message) => {
      const content = (message.content ?? '').toString().trim().slice(0, 800);
      if (!content.length) return acc;

      acc.push({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content,
      });
      return acc;
    }, []);

    return normalized.slice(-limit);
  }

  private buildSystemPrompt(language: 'fr' | 'en', step: ProjectIdeationAssistantStep): string {
    const stepFocus = this.describeStepFocus(step, language);
    if (language === 'en') {
      return `You are ${this.appName} – a structured startup coach helping a solo founder move from idea to actionable project.
Speak plain English, short sentences (<25 words) with an encouraging and realistic tone.
Always follow the four pillars: Exploration, Structuration, Action, Documentation & Orientation.
Every quick win lasts 30 minutes or less, the 30-day goal is realistic for one person, and hypotheses include a clear validation path.
Use only the provided e-learning catalog codes. Never output Markdown or commentary outside the JSON schema.
You MUST return one strict JSON object with two keys: "reply" (your conversational message, Markdown allowed) and "dataUpdate" (only the fields you identified or updated: vision, problems, keywords, sector, stats {confidence, completeness, marketPotential}, canvas {problem, solution, target, valueProp, diff}, persona {name, goal, pain, behavior}, hypotheses, pitch, quickActions, goal30Days, roadmap {step, deadline}).
Focus now: ${stepFocus}`;
    }
    return `Tu es ${this.appName} – un coach structurant qui aide un fondateur seul à cadrer son projet.
Tu écris en français simple, phrases courtes (<25 mots), ton bienveillant mais précis.
Respecte les 4 piliers : Exploration, Structuration, Action, Documentation & Orientation.
Les quick wins durent 30 minutes maximum, l’objectif 30 jours reste réaliste pour une seule personne et chaque hypothèse inclut un test concret.
Utilise uniquement les codes de modules fournis. Aucune sortie hors du JSON attendu.
Tu dois toujours renvoyer un JSON unique avec deux clés : "reply" (ton message conversationnel, Markdown autorisé) et "dataUpdate" (seulement les champs détectés ou mis à jour : vision, problems, keywords, sector, stats {confidence, completeness, marketPotential}, canvas {problem, solution, target, valueProp, diff}, persona {name, goal, pain, behavior}, hypotheses, pitch, quickActions, goal30Days, roadmap {step, deadline}).
Focus actuel : ${stepFocus}`;
  }

  private buildUserPrompt(input: NormalizedProjectIdeationInput): string {
    const labels = PROMPT_LABELS[input.language];
    const fallback = (value: string | null | undefined, fr: string, en: string) =>
      value ?? (input.language === 'en' ? en : fr);
    const stepLabel = this.describeStepFocus(input.step, input.language);
    const conversationHistory = this.renderConversationHistory(
      input.conversationHistory,
      input.language,
    );

    const lines = [
      `${labels.brief}:`,
      `${labels.idea}: ${input.idea}`,
      `${labels.context}: ${fallback(input.context, 'Non précisé', 'Not specified')}`,
      `${labels.motivation}: ${fallback(input.motivation, 'À préciser', 'To be confirmed')}`,
      `${labels.problem}: ${fallback(input.problem, 'À clarifier', 'To clarify')}`,
      `${labels.audience}: ${fallback(input.targetAudience, 'À préciser', 'To define')}`,
      `${labels.stage}: ${fallback(input.stage, 'Idée brute', 'Idea stage')}`,
      `${labels.constraints}: ${fallback(input.constraints, 'Non précisées', 'Not specified')}`,
      `${labels.resources}: ${fallback(input.resources, 'À clarifier', 'To clarify')}`,
      `${labels.differentiator}: ${fallback(input.differentiator, 'À construire', 'To build')}`,
      `${labels.successMetric}: ${fallback(input.successMetric, 'À définir', 'To define')}`,
      '',
      conversationHistory.length
        ? input.language === 'en'
          ? 'Conversation so far (user first, then assistant):'
          : 'Historique récent (utilisateur puis assistant) :'
        : null,
      ...conversationHistory,
      conversationHistory.length ? '' : null,
      `${labels.modulesIntro}:`,
      ...this.modulesCatalog.map(
        (module) =>
          `${module.code} – ${module.title[input.language]} (${module.focus[input.language]})`,
      ),
      '',
      input.language === 'en'
        ? `Stage focus: ${stepLabel}`
        : `Focus de l’étape : ${stepLabel}`,
      '',
      `${labels.instructions}:`,
      input.language === 'en'
        ? '• Always return JSON with two keys: reply (assistant message, Markdown allowed) and dataUpdate (only the fields you filled; empty object if nothing new).'
        : '• Retourne toujours un JSON avec deux clés : reply (message assistant, Markdown autorisé) et dataUpdate (uniquement les champs mis à jour ; objet vide si rien à ajouter).',
      input.language === 'en'
        ? '• Fill every JSON field strictly respecting the schema. 3 problem angles, 3-5 keywords.'
        : '• Remplis chaque champ du JSON. 3 axes problèmes, 3 à 5 mots-clés.',
      input.language === 'en'
        ? '• Persona: add objective, needs, pains, behaviours. Hypotheses include a validation method and success signal.'
        : '• Persona : inclure objectif, besoins, douleurs, comportements. Hypothèses = méthode de test + signal de succès.',
      input.language === 'en'
        ? '• Value proposition = 1 sentence (<=25 words). Pitch = 30-60 seconds with a clear call-to-action.'
        : '• Proposition de valeur = 1 phrase (<=25 mots). Pitch = 30-60 secondes avec call-to-action clair.',
      input.language === 'en'
        ? '• Quick actions: max 30 minutes, include metric + why. Action plan steps show owner (solo founder) and deadline within 30 days.'
        : '• Actions rapides : max 30 min, inclure métrique + pourquoi. Plan d’action = propriétaire (fondateur solo) + échéance < 30 jours.',
      input.language === 'en'
        ? '• Business Model Canvas: concise sentences per block. Business plan light = executive summary, market, strategy, revenue, needs.'
        : '• Business Model Canvas : phrases courtes par bloc. Business plan light = synthèse, marché, stratégie, revenus, besoins.',
      input.language === 'en'
        ? '• Market study: trends, unmet needs, competitors, differentiation. Pitch deck: vision, problem, solution, traction/potential, CTA.'
        : '• Étude de marché : tendances, besoins, concurrents, différenciation. Pitch deck : vision, problème, solution, traction/potentiel, CTA.',
      input.language === 'en'
        ? '• Orientation: 2-4 next steps and 2-4 focus areas (e.g. market validation, structuring, prepare matching).'
        : '• Orientation : 2-4 prochaines étapes + 2-4 focus (ex : validation marché, structuration, préparer le matching).',
      input.language === 'en'
        ? '• Guidance: provide 2-4 nudges to keep the chat moving, segment insights with pains/success signals + confidence level, at least 1 risk alert, a concise project success likelihood, a market potential read, and 2-5 app name ideas if missing.'
        : '• Guidance : donne 2-4 micro-conseils pour poursuivre, des segments avec besoins/signaux de succès + confiance, au moins 1 alerte risque, une estimation de réussite du projet, un potentiel de marché synthétique et 2-5 idées de nom si absent.',
      input.language === 'en'
        ? '• Documentation.nextSteps = concrete recommendations for the founder. Recap highlights headline + motivation boost.'
        : '• Documentation.nextSteps = recommandations concrètes pour le fondateur. Recap = titre + regain de motivation.',
      ...this.buildUserStepInstructions(input.step, input.language),
      input.language === 'en'
        ? '• Return ONLY JSON (no text before/after). reply may include Markdown; other strings stay concise without extra bullet characters.'
        : '• Retourne UNIQUEMENT le JSON (aucun texte autour). reply peut contenir du Markdown ; les autres champs restent concis sans puces.',
    ];

    return lines.join('\n');
  }

  private buildResponseFormat(step: ProjectIdeationAssistantStep, codes: string[]): ResponseFormat {
    const persona = {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'description', 'objective', 'needs', 'pains', 'behaviors'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        objective: { type: 'string' },
        needs: { type: 'string' },
        pains: { type: 'string' },
        behaviors: { type: 'string' },
      },
    };

    const hypothesis = {
      type: 'object',
      additionalProperties: false,
      required: ['statement', 'validation'],
      properties: {
        statement: { type: 'string' },
        validation: { type: 'string' },
      },
    };

    const quickAction = {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'description', 'duration', 'why', 'metric', 'effort'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        duration: { type: 'string' },
        why: { type: 'string' },
        metric: { type: 'string' },
        effort: { type: 'string' },
      },
    };

    const planStep = {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'owner', 'approach', 'deadline'],
      properties: {
        title: { type: 'string' },
        owner: { type: 'string' },
        approach: { type: 'string' },
        deadline: { type: 'string' },
      },
    };

    const dataUpdateStats = {
      type: 'object',
      additionalProperties: false,
      properties: {
        confidence: { type: 'integer', minimum: 0, maximum: 100 },
        completeness: { type: 'integer', minimum: 0, maximum: 100 },
        marketPotential: { type: 'string' },
      },
    };

    const dataUpdateRoadmapStep = {
      type: 'object',
      additionalProperties: false,
      properties: {
        step: { type: 'string' },
        deadline: { type: 'string' },
      },
    };

    const dataUpdate = {
      type: 'object',
      additionalProperties: false,
      properties: {
        vision: { type: 'string' },
        problems: { type: 'array', items: { type: 'string' } },
        keywords: { type: 'array', items: { type: 'string' } },
        sector: { type: 'string' },
        stats: dataUpdateStats,
        canvas: {
          type: 'object',
          additionalProperties: false,
          properties: {
            problem: { type: 'string' },
            solution: { type: 'string' },
            target: { type: 'string' },
            valueProp: { type: 'string' },
            diff: { type: 'string' },
          },
        },
        persona: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            goal: { type: 'string' },
            pain: { type: 'string' },
            behavior: { type: 'string' },
          },
        },
        hypotheses: { type: 'array', items: { type: 'string' } },
        pitch: { type: 'string' },
        quickActions: { type: 'array', items: { type: 'string' } },
        goal30Days: { type: 'string' },
        roadmap: { type: 'array', items: dataUpdateRoadmapStep },
      },
    };

    const exploration = {
      type: 'object',
      additionalProperties: false,
      required: ['vision', 'context', 'problems', 'keywords', 'audience'],
      properties: {
        vision: { type: 'string' },
        context: { type: 'string' },
        problems: { type: 'array', items: { type: 'string' } },
        keywords: { type: 'array', items: { type: 'string' } },
        audience: { type: 'string' },
      },
    };

    const structuration = {
      type: 'object',
      additionalProperties: false,
      required: ['miniCanvas', 'persona', 'hypotheses', 'valueProposition', 'pitch'],
      properties: {
        miniCanvas: {
          type: 'object',
          additionalProperties: false,
          required: ['problem', 'solution', 'target', 'value', 'differentiation'],
          properties: {
            problem: { type: 'string' },
            solution: { type: 'string' },
            target: { type: 'string' },
            value: { type: 'string' },
            differentiation: { type: 'string' },
          },
        },
        persona,
        hypotheses: { type: 'array', items: hypothesis },
        valueProposition: { type: 'string' },
        pitch: { type: 'string' },
      },
    };

    const action = {
      type: 'object',
      additionalProperties: false,
      required: ['quickActions', 'goal30Days', 'actionPlan', 'roadmapSummary'],
      properties: {
        quickActions: { type: 'array', items: quickAction },
        goal30Days: {
          type: 'object',
          additionalProperties: false,
          required: ['statement', 'metric', 'milestones'],
          properties: {
            statement: { type: 'string' },
            metric: { type: 'string' },
            milestones: { type: 'array', items: { type: 'string' } },
          },
        },
        actionPlan: { type: 'array', items: planStep },
        roadmapSummary: { type: 'string' },
      },
    };

    const documentation = {
      type: 'object',
      additionalProperties: false,
      required: [
        'businessModelCanvas',
        'businessPlan',
        'marketStudy',
        'pitchDeck',
        'personaRecap',
        'nextSteps',
        'recap',
      ],
      properties: {
        businessModelCanvas: {
          type: 'object',
          additionalProperties: false,
          required: [
            'keyPartners',
            'keyActivities',
            'keyResources',
            'valuePropositions',
            'customerRelationships',
            'channels',
            'customerSegments',
            'costStructure',
            'revenueStreams',
          ],
          properties: {
            keyPartners: { type: 'string' },
            keyActivities: { type: 'string' },
            keyResources: { type: 'string' },
            valuePropositions: { type: 'string' },
            customerRelationships: { type: 'string' },
            channels: { type: 'string' },
            customerSegments: { type: 'string' },
            costStructure: { type: 'string' },
            revenueStreams: { type: 'string' },
          },
        },
        businessPlan: {
          type: 'object',
          additionalProperties: false,
          required: ['executiveSummary', 'market', 'strategy', 'revenueModel', 'needs'],
          properties: {
            executiveSummary: { type: 'string' },
            market: { type: 'string' },
            strategy: { type: 'string' },
            revenueModel: { type: 'string' },
            needs: { type: 'string' },
          },
        },
        marketStudy: {
          type: 'object',
          additionalProperties: false,
          required: ['trends', 'needs', 'competitors', 'differentiation'],
          properties: {
            trends: { type: 'string' },
            needs: { type: 'string' },
            competitors: { type: 'string' },
            differentiation: { type: 'string' },
          },
        },
        pitchDeck: {
          type: 'object',
          additionalProperties: false,
          required: ['vision', 'problem', 'solution', 'traction', 'potential', 'callToAction'],
          properties: {
            vision: { type: 'string' },
            problem: { type: 'string' },
            solution: { type: 'string' },
            traction: { type: 'string' },
            potential: { type: 'string' },
            callToAction: { type: 'string' },
          },
        },
        personaRecap: persona,
        nextSteps: { type: 'array', items: { type: 'string' } },
        recap: {
          type: 'object',
          additionalProperties: false,
          required: ['headline', 'summary', 'motivation'],
          properties: {
            headline: { type: 'string' },
            summary: { type: 'string' },
            motivation: { type: 'string' },
          },
        },
      },
    };

    const orientation = {
      type: 'object',
      additionalProperties: false,
      required: ['recommendedSteps', 'focusAreas'],
      properties: {
        recommendedSteps: { type: 'array', items: { type: 'string' } },
        focusAreas: { type: 'array', items: { type: 'string' } },
      },
    };

    const elearning = {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['moduleCode', 'reason'],
        properties: {
          moduleCode: { type: 'string', enum: codes },
          reason: { type: 'string' },
        },
      },
    };

    const guidance = {
      type: 'object',
      additionalProperties: false,
      required: ['nudges', 'segmentInsights', 'riskAlerts', 'projectSuccessStats', 'marketPotential', 'appNameIdeas'],
      properties: {
        nudges: { type: 'array', items: { type: 'string' } },
        segmentInsights: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['segment', 'painsOrNeeds', 'successSignals'],
            properties: {
              segment: { type: 'string' },
              painsOrNeeds: { type: 'string' },
              successSignals: { type: 'string' },
              indicativeSuccessRate: { type: 'string' },
              confidence: { type: 'string' },
            },
          },
        },
        riskAlerts: { type: 'array', items: { type: 'string' } },
        suggestedNextInput: { type: 'string' },
        projectSuccessStats: { type: 'string' },
        marketPotential: { type: 'string' },
        appNameIdeas: { type: 'array', items: { type: 'string' } },
      },
    };

    const schemaName = `ProjectIdeationDeliverable_${step.toLowerCase()}`;
    const base: ResponseFormat & {
      jsonSchema: {
        schemaDefinition: {
          type: string;
          additionalProperties: boolean;
          required: string[];
          properties: Record<string, unknown>;
        };
      };
    } = {
      type: 'json_schema',
      jsonSchema: {
        name: schemaName,
        strict: true,
        schemaDefinition: {
          type: 'object',
          additionalProperties: false,
          required: [] as string[],
          properties: {} as Record<string, unknown>,
        },
      },
    };

    const schemaDefinition = base.jsonSchema.schemaDefinition;

    const addBlock = (key: string, block: Record<string, unknown>) => {
      schemaDefinition.properties[key] = block;
      schemaDefinition.required.push(key);
    };

    addBlock('reply', { type: 'string' });
    addBlock('dataUpdate', dataUpdate);

    if (this.shouldIncludeStepBlock(step, ProjectIdeationAssistantStep.Exploration)) {
      addBlock('exploration', exploration);
    }

    if (this.shouldIncludeStepBlock(step, ProjectIdeationAssistantStep.Structuration)) {
      addBlock('structuration', structuration);
    }

    if (this.shouldIncludeStepBlock(step, ProjectIdeationAssistantStep.Action)) {
      addBlock('action', action);
    }

    if (this.shouldIncludeStepBlock(step, ProjectIdeationAssistantStep.Documentation)) {
      addBlock('documentation', documentation);
    }

    if (this.shouldIncludeStepBlock(step, ProjectIdeationAssistantStep.Orientation)) {
      addBlock('orientation', orientation);
      addBlock('elearning', elearning);
    }

    addBlock('guidance', guidance);

    return base;
  }

  private describeStepFocus(step: ProjectIdeationAssistantStep, language: 'fr' | 'en'): string {
    const descriptions = {
      [ProjectIdeationAssistantStep.All]: {
        fr: 'Parcours complet : Exploration, Structuration, Action, Documentation & Orientation',
        en: 'Full journey: Exploration, Structuration, Action, Documentation & Orientation',
      },
      [ProjectIdeationAssistantStep.Exploration]: {
        fr: 'Exploration – vision, contexte, 3 problèmes, mots-clés, public cible',
        en: 'Exploration – vision, context, 3 problem angles, keywords, target audience',
      },
      [ProjectIdeationAssistantStep.Structuration]: {
        fr: 'Structuration – mini-canvas, persona, hypothèses, proposition de valeur, pitch',
        en: 'Structuration – mini canvas, persona, hypotheses, value proposition, pitch',
      },
      [ProjectIdeationAssistantStep.Action]: {
        fr: 'Action – quick wins, objectif 30 jours, plan, résumé roadmap',
        en: 'Action – quick wins, 30-day goal, action plan, roadmap summary',
      },
      [ProjectIdeationAssistantStep.Documentation]: {
        fr: 'Documentation – BMC, business plan light, étude de marché, pitch deck, persona recap, next steps, recap',
        en: 'Documentation – BMC, light business plan, market study, pitch deck, persona recap, next steps, recap',
      },
      [ProjectIdeationAssistantStep.Orientation]: {
        fr: 'Orientation – prochaines étapes, focus et recommandations e-learning',
        en: 'Orientation – next steps, focus areas and e-learning recommendations',
      },
    } as const;

    const entry = descriptions[step] ?? descriptions[ProjectIdeationAssistantStep.All];
    return entry[language];
  }

  private buildUserStepInstructions(
    step: ProjectIdeationAssistantStep,
    language: 'fr' | 'en',
  ): string[] {
    const t = (en: string, fr: string) => (language === 'en' ? en : fr);
    switch (step) {
      case ProjectIdeationAssistantStep.Exploration:
        return [
          t(
            '• Output ONLY the Exploration block (vision, context, 3 problem angles, 3-5 keywords, target audience).',
            '• Génère UNIQUEMENT le bloc Exploration (vision, contexte, 3 problèmes, 3-5 mots-clés, cible).',
          ),
        ];
      case ProjectIdeationAssistantStep.Structuration:
        return [
          t(
            '• Output ONLY the Structuration block (mini-canvas, persona, hypotheses, value proposition, pitch).',
            '• Génère UNIQUEMENT le bloc Structuration (mini-canvas, persona, hypothèses, proposition de valeur, pitch).',
          ),
        ];
      case ProjectIdeationAssistantStep.Action:
        return [
          t(
            '• Output ONLY the Action block (quick wins, 30-day goal, detailed action plan, roadmap summary).',
            '• Génère UNIQUEMENT le bloc Action (quick wins, objectif 30 jours, plan détaillé, résumé roadmap).',
          ),
        ];
      case ProjectIdeationAssistantStep.Documentation:
        return [
          t(
            '• Output ONLY the Documentation block (BMC, business plan light, market study, pitch deck, persona recap, next steps, recap).',
            '• Génère UNIQUEMENT la Documentation (BMC, business plan light, étude de marché, pitch deck, persona recap, prochaines étapes, recap).',
          ),
        ];
      case ProjectIdeationAssistantStep.Orientation:
        return [
          t(
            '• Output ONLY the Orientation block with 2-4 recommended steps, 2-4 focus areas and 2-3 e-learning recommendations.',
            '• Génère UNIQUEMENT le bloc Orientation avec 2-4 prochaines étapes, 2-4 focus et 2-3 recommandations e-learning.',
          ),
        ];
      case ProjectIdeationAssistantStep.All:
        return [
          t(
            '• Return the full JSON covering every pillar from Exploration to Orientation.',
            '• Retourne le JSON complet couvrant tous les piliers d’Exploration à Orientation.',
          ),
        ];
      default:
        return [];
    }
  }

  private shouldIncludeStepBlock(
    step: ProjectIdeationAssistantStep,
    target: ProjectIdeationAssistantStep,
  ): boolean {
    return step === ProjectIdeationAssistantStep.All || step === target;
  }

  private computeCacheKey(input: NormalizedProjectIdeationInput) {
    return createHash('sha256')
      .update(`${this.schemaVersion}::${JSON.stringify(input)}`, 'utf8')
      .digest('hex');
  }
}
