import type {
  ConversationExampleBuilder,
  StepQuestionBuilder,
} from './assistant.interfaces';
import { ProjectIdeationAssistantStep } from './assistant.types';

export const buildStepQuestions: StepQuestionBuilder = (input) => {
  const isFr = input.language === 'fr';
  const q: string[] = [];
  const add = (condition: boolean, fr: string, en: string) => {
    if (condition) q.push(isFr ? fr : en);
  };

  switch (input.step) {
    case ProjectIdeationAssistantStep.Exploration:
      add(true, 'Quelle est ton idée en une phrase claire ?', 'What is your idea in one clear sentence?');
      add(!input.context, 'Dans quel contexte ou secteur veux-tu l’appliquer ?', 'In what context or domain do you want to apply it?');
      add(!input.motivation, 'Pourquoi ce projet te tient-il à cœur ?', 'Why does this project matter to you?');
      add(true, 'Qui serait la cible principale ?', 'Who would be the main audience?');
      add(true, 'Quels sont les 3 problèmes majeurs que tu veux régler ?', 'What are the top 3 problems you want to solve?');
      add(true, 'Donne 3 à 5 mots-clés qui décrivent ton idée.', 'Share 3 to 5 keywords that describe your idea.');
      break;
    case ProjectIdeationAssistantStep.Structuration:
      add(!input.problem, 'Formule le problème en une phrase.', 'State the problem in one sentence.');
      add(true, 'Quelle solution imagines-tu concrètement ?', 'What solution do you envision, concretely?');
      add(true, 'Précise le segment cible prioritaire.', 'Specify the priority customer segment.');
      add(!input.differentiator, 'Qu’est-ce qui te différencie des alternatives ?', 'What makes you different from alternatives?');
      add(true, 'Quelle promesse de valeur veux-tu faire en une phrase ?', 'What one-sentence value proposition do you want to make?');
      add(true, 'Quels sont 3 à 5 risques ou hypothèses à tester ?', 'What are 3 to 5 risks or hypotheses to test?');
      break;
    case ProjectIdeationAssistantStep.Action:
      add(!input.constraints, 'Quelles contraintes de temps ou budget as-tu ?', 'What time or budget constraints do you have?');
      add(!input.resources, 'Quelles ressources (outils, réseau) peux-tu utiliser ?', 'What resources (tools, network) can you leverage?');
      add(true, 'Quels petits pas (<=30 min) peux-tu faire dès maintenant ?', 'What quick wins (<=30 min) can you do right now?');
      add(true, 'Quel objectif réaliste pour les 30 prochains jours ?', 'What realistic goal for the next 30 days?');
      add(true, 'Quelle métrique suivras-tu pour vérifier l’avancée ?', 'Which metric will you track to confirm progress?');
      break;
    case ProjectIdeationAssistantStep.Documentation:
      add(true, 'Comment résumerais-tu le business en 3 lignes ?', 'How would you summarise the business in 3 lines?');
      add(true, 'Qui sont les concurrents ou alternatives principales ?', 'Who are the main competitors or alternatives?');
      add(true, 'Quels canaux utiliseras-tu pour toucher la cible ?', 'Which channels will you use to reach the audience?');
      add(true, 'Quel modèle de revenus envisages-tu ?', 'What revenue model do you envision?');
      add(true, 'De quoi as-tu besoin pour lancer (budget, outils, aides) ?', 'What do you need to launch (budget, tools, support)?');
      break;
    case ProjectIdeationAssistantStep.Orientation:
      add(true, 'De quoi as-tu le plus besoin maintenant (marché, produit, pitch) ?', 'What do you need most right now (market, product, pitch)?');
      add(true, 'Vers quelle prochaine étape veux-tu te diriger ?', 'Which next step do you want to head towards?');
      break;
    case ProjectIdeationAssistantStep.All:
      add(true, 'Commence par résumer ton idée en 1 phrase.', 'Start by summarising your idea in one sentence.');
      add(true, 'Liste 3 problèmes majeurs rencontrés par ta cible.', 'List the top 3 problems your target faces.');
      add(true, 'Décris ta solution et ce qui te différencie.', 'Describe your solution and what differentiates it.');
      add(true, 'Quel objectif réaliste pour les 30 prochains jours ?', 'What realistic goal for the next 30 days?');
      add(true, 'Quels canaux et revenus imagines-tu ?', 'Which channels and revenue streams do you imagine?');
      break;
    default:
      break;
  }

  return q;
};

export const buildConversationExample: ConversationExampleBuilder = (
  input,
  appName,
  focus,
  stepQuestions,
) => {
  const isFr = input.language === 'fr';
  const idea = input.idea.length > 160 ? `${input.idea.slice(0, 157)}…` : input.idea;
  const nextPrompt =
    stepQuestions[0] ?? (isFr ? 'Quelle précision veux-tu ajouter ensuite ?' : 'What should we clarify next?');

  const opening = isFr
    ? `Bonjour ! Je suis ton assistant ${appName}. Prêt à transformer ton idée en projet concret ? Raconte-moi simplement ce que tu as en tête.`
    : `Hi! I'm your ${appName} assistant. Ready to turn your idea into an actionable project? Tell me what you have in mind.`;

  const bridge = isFr
    ? `Super. Si je résume en une phrase : ${idea}. Pour avancer sur ${focus}, réponds à : ${nextPrompt}`
    : `Great. If I summarise in one line: ${idea}. To move forward on ${focus}, answer this: ${nextPrompt}`;

  return {
    opening,
    turns: [
      { speaker: 'assistant', message: opening },
      { speaker: 'user', message: idea },
      { speaker: 'assistant', message: bridge },
    ],
    nextUserPrompt: nextPrompt,
  };
};
