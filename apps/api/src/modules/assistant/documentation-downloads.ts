import { PDFDocument, StandardFonts, type PDFFont } from 'pdf-lib';

import type { AssistantDocumentDownload, ProjectIdeationAssistantDocumentation } from './assistant.types';

class DocumentationRenderer {
  constructor(private readonly language: 'fr' | 'en', private readonly documentation: ProjectIdeationAssistantDocumentation) {}

  async buildDownloads(): Promise<AssistantDocumentDownload[]> {
    const isFr = this.language === 'fr';

    const markdownDownloads: AssistantDocumentDownload[] = [
      {
        filename: 'business-model-canvas.md',
        mimeType: 'text/markdown',
        title: isFr ? 'Business Model Canvas (simplifié)' : 'Business Model Canvas (light)',
        encoding: 'utf8',
        content: this.renderBusinessModelCanvas(),
      },
      {
        filename: 'business-plan-light.md',
        mimeType: 'text/markdown',
        title: isFr ? 'Business Plan Light' : 'Light Business Plan',
        encoding: 'utf8',
        content: this.renderBusinessPlanLight(),
      },
      {
        filename: 'market-study.md',
        mimeType: 'text/markdown',
        title: isFr ? 'Étude de marché synthétique' : 'Market study (concise)',
        encoding: 'utf8',
        content: this.renderMarketStudy(),
      },
      {
        filename: 'pitch-deck-1page.md',
        mimeType: 'text/markdown',
        title: isFr ? 'Pitch Deck 1 page' : 'One-page pitch deck',
        encoding: 'utf8',
        content: this.renderPitchDeck(),
      },
      {
        filename: 'persona-recap.md',
        mimeType: 'text/markdown',
        title: isFr ? 'Persona (récapitulatif)' : 'Persona (recap)',
        encoding: 'utf8',
        content: this.renderPersonaRecap(),
      },
      {
        filename: 'next-steps.md',
        mimeType: 'text/markdown',
        title: isFr ? 'Étapes suivantes' : 'Next steps',
        encoding: 'utf8',
        content: this.renderNextSteps(),
      },
      {
        filename: 'project-recap.md',
        mimeType: 'text/markdown',
        title: isFr ? 'Récapitulatif global' : 'Global recap',
        encoding: 'utf8',
        content: this.renderRecap(),
      },
    ];

    const pdfDownloads = await Promise.all(
      markdownDownloads.map(async (download) => ({
        filename: download.filename.replace(/\.md$/, '.pdf'),
        mimeType: 'application/pdf',
        title: `${download.title} (PDF)`,
        encoding: 'base64' as const,
        content: await this.renderPdf(download.title, download.content),
      })),
    );

    return [...markdownDownloads, ...pdfDownloads];
  }

  private renderBusinessModelCanvas(): string {
    const { businessModelCanvas } = this.documentation;
    const isFr = this.language === 'fr';
    const title = isFr ? 'Business Model Canvas (simplifié)' : 'Business Model Canvas (light)';
    const labels = isFr
      ? {
          keyPartners: 'Partenaires clés',
          keyActivities: 'Activités clés',
          keyResources: 'Ressources clés',
          valuePropositions: 'Proposition de valeur',
          customerRelationships: 'Relation client',
          channels: 'Canaux',
          customerSegments: 'Segments clients',
          costStructure: 'Structure de coûts',
          revenueStreams: 'Revenus',
        }
      : {
          keyPartners: 'Key partners',
          keyActivities: 'Key activities',
          keyResources: 'Key resources',
          valuePropositions: 'Value proposition',
          customerRelationships: 'Customer relationships',
          channels: 'Channels',
          customerSegments: 'Customer segments',
          costStructure: 'Cost structure',
          revenueStreams: 'Revenue streams',
        };

    return [
      `# ${title}`,
      `- ${labels.keyPartners}: ${businessModelCanvas.keyPartners}`,
      `- ${labels.keyActivities}: ${businessModelCanvas.keyActivities}`,
      `- ${labels.keyResources}: ${businessModelCanvas.keyResources}`,
      `- ${labels.valuePropositions}: ${businessModelCanvas.valuePropositions}`,
      `- ${labels.customerRelationships}: ${businessModelCanvas.customerRelationships}`,
      `- ${labels.channels}: ${businessModelCanvas.channels}`,
      `- ${labels.customerSegments}: ${businessModelCanvas.customerSegments}`,
      `- ${labels.costStructure}: ${businessModelCanvas.costStructure}`,
      `- ${labels.revenueStreams}: ${businessModelCanvas.revenueStreams}`,
      '',
      isFr
        ? '👉 Ajoute ce canvas à ta doc pour partager facilement la vision business.'
        : '👉 Add this canvas to your docs to share the business view quickly.',
    ].join('\n');
  }

  private renderBusinessPlanLight(): string {
    const { businessPlan } = this.documentation;
    const isFr = this.language === 'fr';
    const title = isFr ? 'Business Plan Light' : 'Light Business Plan';
    const labels = isFr
      ? {
          executiveSummary: 'Résumé exécutif',
          market: 'Marché & opportunité',
          strategy: 'Stratégie & go-to-market',
          revenue: 'Revenus & modèle',
          needs: 'Besoins (budget/ressources)',
        }
      : {
          executiveSummary: 'Executive summary',
          market: 'Market & opportunity',
          strategy: 'Strategy & go-to-market',
          revenue: 'Revenue & model',
          needs: 'Needs (budget/resources)',
        };

    return [
      `# ${title}`,
      `## ${labels.executiveSummary}`,
      businessPlan.executiveSummary,
      '',
      `## ${labels.market}`,
      businessPlan.market,
      '',
      `## ${labels.strategy}`,
      businessPlan.strategy,
      '',
      `## ${labels.revenue}`,
      businessPlan.revenueModel,
      '',
      `## ${labels.needs}`,
      businessPlan.needs,
    ].join('\n');
  }

  private renderMarketStudy(): string {
    const { marketStudy } = this.documentation;
    const isFr = this.language === 'fr';
    const title = isFr ? 'Étude de marché (synthèse)' : 'Market study (summary)';
    const labels = isFr
      ? {
          trends: 'Tendances clés',
          unmetNeeds: 'Besoins non couverts',
          competitors: 'Concurrents / alternatives',
          differentiation: 'Différenciation',
        }
      : {
          trends: 'Key trends',
          unmetNeeds: 'Unmet needs',
          competitors: 'Competitors / alternatives',
          differentiation: 'Differentiation',
        };

    return [
      `# ${title}`,
      `- ${labels.trends}: ${marketStudy.trends}`,
      `- ${labels.unmetNeeds}: ${marketStudy.needs}`,
      `- ${labels.competitors}: ${marketStudy.competitors}`,
      `- ${labels.differentiation}: ${marketStudy.differentiation}`,
    ].join('\n');
  }

  private renderPitchDeck(): string {
    const { pitchDeck } = this.documentation;
    const isFr = this.language === 'fr';
    const title = isFr ? 'Pitch Deck 1 page' : 'One-page pitch deck';
    const labels = isFr
      ? {
          vision: 'Vision',
          problem: 'Problème',
          solution: 'Solution',
          potential: 'Potentiel / traction',
          callToAction: 'Call-to-action',
        }
      : {
          vision: 'Vision',
          problem: 'Problem',
          solution: 'Solution',
          potential: 'Potential / traction',
          callToAction: 'Call-to-action',
        };

    return [
      `# ${title}`,
      `- ${labels.vision}: ${pitchDeck.vision}`,
      `- ${labels.problem}: ${pitchDeck.problem}`,
      `- ${labels.solution}: ${pitchDeck.solution}`,
      `- ${labels.potential}: ${pitchDeck.potential}`,
      `- ${labels.callToAction}: ${pitchDeck.callToAction}`,
    ].join('\n');
  }

  private renderPersonaRecap(): string {
    const { personaRecap } = this.documentation;
    const isFr = this.language === 'fr';
    const title = isFr ? 'Persona (récapitulatif)' : 'Persona (recap)';
    const labels = isFr
      ? {
          objective: 'Objectif',
          needs: 'Besoins',
          pains: 'Douleurs',
          behaviors: 'Comportements',
          name: 'Nom',
          description: 'Description',
        }
      : {
          objective: 'Objective',
          needs: 'Needs',
          pains: 'Pains',
          behaviors: 'Behaviours',
          name: 'Name',
          description: 'Description',
        };

    return [
      `# ${title}`,
      `- ${labels.name}: ${personaRecap.name}`,
      `- ${labels.description}: ${personaRecap.description}`,
      `- ${labels.objective}: ${personaRecap.objective}`,
      `- ${labels.needs}: ${personaRecap.needs}`,
      `- ${labels.pains}: ${personaRecap.pains}`,
      `- ${labels.behaviors}: ${personaRecap.behaviors}`,
    ].join('\n');
  }

  private renderNextSteps(): string {
    const { nextSteps } = this.documentation;
    const isFr = this.language === 'fr';
    const title = isFr ? 'Étapes suivantes' : 'Next steps';

    return [
      `# ${title}`,
      ...nextSteps.map((line) => `- ${line}`),
    ].join('\n');
  }

  private renderRecap(): string {
    const { recap } = this.documentation;
    const isFr = this.language === 'fr';
    const title = isFr ? 'Récapitulatif global' : 'Global recap';
    const labels = isFr
      ? { headline: 'À retenir', motivation: 'Motivation' }
      : { headline: 'Key takeaway', motivation: 'Motivation' };

    return [
      `# ${title}`,
      `- ${labels.headline}: ${recap.headline}`,
      `- ${labels.motivation}: ${recap.motivation}`,
    ].join('\n');
  }

  private async renderPdf(title: string, content: string): Promise<string> {
    const doc = await PDFDocument.create();
    const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
    const headingFont = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage();
    const { width, height } = page.getSize();
    const margin = 48;
    const maxWidth = width - margin * 2;
    let cursorY = height - margin;

    const sections = content.split('\n');
    for (const rawLine of sections) {
      const isHeading = rawLine.startsWith('#');
      const text = rawLine.replace(/^#+\s*/, '').trim() || ' ';
      const font = isHeading ? headingFont : bodyFont;
      const size = isHeading ? 16 : 12;
      const spacing = isHeading ? 10 : 6;
      const lines = this.wrapText(text, font, size, maxWidth);

      for (const line of lines) {
        if (cursorY <= margin + size) {
          page = doc.addPage();
          cursorY = page.getSize().height - margin;
        }

        page.drawText(line, {
          x: margin,
          y: cursorY,
          size,
          font,
        });
        cursorY -= size + spacing;
      }
      cursorY -= 4;
    }

    return doc.saveAsBase64({ dataUri: false });
  }

  private wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const tentative = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(tentative, size);
      if (width <= maxWidth) {
        currentLine = tentative;
        continue;
      }

      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }

    if (currentLine) lines.push(currentLine);
    return lines.length ? lines : [' '];
  }
}

export async function buildDocumentationDownloads(
  language: 'fr' | 'en',
  documentation?: ProjectIdeationAssistantDocumentation | null,
): Promise<AssistantDocumentDownload[] | null> {
  if (!documentation) return null;
  return new DocumentationRenderer(language, documentation).buildDownloads();
}
