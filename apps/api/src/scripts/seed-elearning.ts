import { PrismaClient, Prisma, CourseLevel, CourseVisibility, PublishStatus, BlockKind, QuestionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function ensureUser(email: string, password: string, role: 'user' | 'creator' | 'admin' = 'creator') {
  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) return existing;
  const password_hash = await bcrypt.hash(password, 12);
  return prisma.users.create({ data: { email, password_hash, role } });
}

function buildCourse(authorId: string): Prisma.CourseCreateInput {
  const publishedAt = new Date();
  return {
    slug: 'parcours-product-builder',
    title: 'Parcours Product Builder',
    subtitle: 'Apprendre à valider une idée et livrer une première version en quelques semaines, sans équipe pléthorique.',
    description:
      "Un parcours guidé pour maîtriser les bases du product building : découverte utilisateur, cadrage, prototypage, mise en production légère et mesure d'impact.",
    level: CourseLevel.INTERMEDIATE,
    visibility: CourseVisibility.PUBLIC,
    status: PublishStatus.PUBLISHED,
    language: 'fr',
    track: 'product',
    estimatedMinutes: 260,
    author: { connect: { id: authorId } },
    publishedAt,
    tags: {
      create: [{ value: 'product' }, { value: 'no-code' }, { value: 'validation' }],
    },
    sections: {
      create: [
        {
          title: 'Comprendre son utilisateur',
          position: 1,
          lessons: {
            create: [
              {
                slug: 'cartographier-les-douleurs',
                title: 'Cartographier les douleurs client',
                summary: 'Identifier les irritants majeurs et formuler des hypothèses actionnables.',
                position: 1,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 10,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Collectez trois entretiens clients et listez les irritants les plus répétés. Reformulez-les en besoins clairs.',
                              },
                            ],
                          },
                          {
                            type: 'bulletList',
                            content: [
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Concentrez-vous sur les points répétés.' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hiérarchisez selon la fréquence et la douleur.' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Formulez une hypothèse testable par point.' }] }] },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                slug: 'definir-une-proposition',
                title: 'Définir une proposition de valeur testable',
                summary: 'Rédiger une promesse simple alignée sur une douleur prioritaire et un segment clair.',
                position: 2,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 18,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: "Formulez une phrase qui décrit l'utilisateur, la douleur prioritaire et le bénéfice mesurable de votre solution.",
                              },
                            ],
                          },
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                marks: [{ type: 'bold' }],
                                text: 'Exemple : ',
                              },
                              {
                                type: 'text',
                                text: '"Les PM en start-up qui perdent du temps sur le support peuvent déployer un assistant qui résout 30% des tickets récurrents."',
                              },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                slug: 'prioriser-les-personas',
                title: 'Prioriser les personas et leurs scénarios clés',
                summary: 'Déterminer quel segment attaquer en premier selon la taille du problème et la facilité d’accès.',
                position: 3,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 22,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Comparez chaque persona sur trois axes : douleur ressentie, budget/temps disponible et facilité d’accès pour vos entretiens.',
                              },
                            ],
                          },
                          {
                            type: 'bulletList',
                            content: [
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Donnez un score 1-5 par critère.' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Gardez un seul persona cible et un persona secondaire.' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rédigez un scénario avant/après pour matérialiser la transformation promise.' }] }] },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          title: 'Cadrer et prototyper rapidement',
          position: 2,
          lessons: {
            create: [
              {
                slug: 'construire-un-prototype',
                title: 'Construire un prototype ciblé',
                summary: 'Assembler un flux simple pour tester la promesse auprès de vrais utilisateurs.',
                position: 1,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 28,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Identifiez un scénario unique à prototyper. Limitez-vous à trois écrans ou actions pour réduire le temps de construction.',
                              },
                            ],
                          },
                          {
                            type: 'bulletList',
                            content: [
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Storyboard rapide du scénario cible.' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Choisissez un outil no-code que vous maîtrisez.' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ajoutez un suivi simple (formulaire ou analytics léger).' }] }] },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                slug: 'valider-avec-un-quiz',
                title: 'Valider l’adhésion avec un quiz court',
                summary: 'Mesurer la compréhension et la valeur perçue avec trois questions fermées.',
                position: 2,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 18,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Partagez votre prototype et vérifiez que les utilisateurs identifient la valeur clé sans guidage.',
                              },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
                quiz: {
                  create: {
                    title: 'Validation express',
                    passScore: 70,
                    questions: {
                      create: [
                        {
                          prompt: 'Quel est l’objectif principal du prototype ?',
                          type: QuestionType.SINGLE,
                          position: 1,
                          options: {
                            choices: [
                              { id: 'a', label: 'Démontrer toutes les fonctionnalités prévues' },
                              { id: 'b', label: 'Tester une promesse précise auprès d’un segment' },
                              { id: 'c', label: 'Remplacer immédiatement un produit existant' },
                            ],
                          },
                          answer: 'b',
                        },
                        {
                          prompt: 'Quelles preuves indiquent une adhésion forte ?',
                          type: QuestionType.MCQ,
                          position: 2,
                          options: {
                            choices: [
                              { id: 'a', label: 'Les utilisateurs reviennent tester sans relance' },
                              { id: 'b', label: 'Le prototype contient 10 écrans complets' },
                              { id: 'c', label: 'Plusieurs personnes partagent le lien à leur équipe' },
                              { id: 'd', label: 'Le suivi d’usage reste vide après une semaine' },
                            ],
                          },
                          answer: ['a', 'c'],
                        },
                        {
                          prompt: 'Un MVP doit forcément être parfait avant d’être montré.',
                          type: QuestionType.TRUE_FALSE,
                          position: 3,
                          options: { trueLabel: 'Vrai', falseLabel: 'Faux' },
                          answer: false,
                        },
                      ],
                    },
                  },
                },
              },
              {
                slug: 'decrire-le-parcours-utilisateur',
                title: 'Décrire le parcours utilisateur en tâches mesurables',
                summary: 'Rédiger des user stories concises et des critères de succès observables.',
                position: 3,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 24,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Définissez trois user stories maximum, chacune avec un critère de succès observable (clic, soumission, réponse).',
                              },
                            ],
                          },
                          {
                            type: 'paragraph',
                            content: [
                              { type: 'text', marks: [{ type: 'bold' }], text: 'Tip :' },
                              {
                                type: 'text',
                                text: ' incluez une friction volontaire (ex: champ obligatoire) pour vérifier la motivation réelle.',
                              },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          title: 'Expérimenter un go-to-market',
          position: 3,
          lessons: {
            create: [
              {
                slug: 'preparer-une-campagne',
                title: 'Préparer une campagne de lancement ciblée',
                summary: 'Choisir un canal unique, une promesse claire et un call-to-action mesurable.',
                position: 1,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 30,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Choisissez un canal où votre persona est déjà actif : newsletter, Slack/Discord niche, communauté ou partenariat.',
                              },
                            ],
                          },
                          {
                            type: 'bulletList',
                            content: [
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rédigez un message de 3 phrases : douleur, promesse, preuve.' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Fixez une métrique principale (taux de clic, réponse, précommande).' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Planifiez deux relances différentes au lieu d’une seule.' }] }] },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                slug: 'offrir-une-preuve',
                title: 'Offrir une preuve de valeur rapide',
                summary: 'Livrer un échantillon ou un template pour montrer la transformation promise.',
                position: 2,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 26,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Créez un artefact tangible : mini-dashboard Notion, workflow Zapier, ou script prêt à l’emploi.',
                              },
                            ],
                          },
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Mesurez le ratio téléchargements / utilisateurs exposés pour décider de poursuivre ou pivoter.',
                              },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          title: 'Mesurer et itérer',
          position: 4,
          lessons: {
            create: [
              {
                slug: 'mettre-en-place-des-metrics',
                title: 'Mettre en place des métriques North Star',
                summary: 'Relier la promesse produit à un indicateur principal et à trois garde-fous.',
                position: 1,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 32,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Formulez une North Star Metric (NSM) reliée à la transformation utilisateur (ex: tickets résolus automatiquement).',
                              },
                            ],
                          },
                          {
                            type: 'bulletList',
                            content: [
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ajoutez 3 garde-fous : activation, rétention courte, qualité perçue.' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Créez un tableau hebdo avec 4 courbes max.' }] }] },
                              { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Planifiez une décision binaire chaque semaine : continuer, pivoter, arrêter.' }] }] },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                slug: 'boucle-apprentissage',
                title: 'Installer une boucle d’apprentissage continue',
                summary: 'Structurer les feedbacks utilisateurs et prioriser les itérations courtes.',
                position: 2,
                status: PublishStatus.PUBLISHED,
                publishedAt,
                estimatedMinutes: 30,
                blocks: {
                  create: [
                    {
                      kind: BlockKind.RICHTEXT,
                      position: 1,
                      dataJson: {
                        type: 'doc',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Collectez systématiquement les objections, les demandes et les signaux positifs. Taggez-les par thème et par intensité.',
                              },
                            ],
                          },
                          {
                            type: 'paragraph',
                            content: [
                              {
                                type: 'text',
                                text: 'Menez un rituel hebdomadaire de 45 min : 15 min de revue des métriques, 15 min de priorisation, 15 min de planification sprint.',
                              },
                            ],
                          },
                        ],
                      },
                    },
                  ],
                },
                quiz: {
                  create: {
                    title: 'Boucle d’apprentissage',
                    passScore: 80,
                    questions: {
                      create: [
                        {
                          prompt: 'Quel signal indique que votre NSM est pertinente ?',
                          type: QuestionType.SINGLE,
                          position: 1,
                          options: {
                            choices: [
                              { id: 'a', label: 'Elle augmente lorsque vous livrez une action qui correspond à la promesse' },
                              { id: 'b', label: 'Elle est facile à mesurer même si elle ne change jamais' },
                              { id: 'c', label: 'Elle baisse quand vous ajoutez des fonctionnalités demandées' },
                            ],
                          },
                          answer: 'a',
                        },
                        {
                          prompt: 'Quels éléments inclure dans une rétrospective hebdomadaire ?',
                          type: QuestionType.MCQ,
                          position: 2,
                          options: {
                            choices: [
                              { id: 'a', label: 'Les chiffres clés et leur évolution' },
                              { id: 'b', label: 'Les rumeurs du marché sans sources' },
                              { id: 'c', label: 'Les feedbacks utilisateurs taggés par thème' },
                              { id: 'd', label: 'Les décisions binaires (continuer, pivoter, arrêter)' },
                            ],
                          },
                          answer: ['a', 'c', 'd'],
                        },
                        {
                          prompt: 'Un sprint hebdomadaire doit prévoir au minimum trois nouvelles fonctionnalités.',
                          type: QuestionType.TRUE_FALSE,
                          position: 3,
                          options: { trueLabel: 'Vrai', falseLabel: 'Faux' },
                          answer: false,
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function main() {
  const authorEmail = process.env.ELEARNING_AUTHOR_EMAIL || 'teacher@cofound.local';
  const learnerEmail = process.env.ELEARNING_LEARNER_EMAIL || 'learner@cofound.local';
  const password = process.env.ELEARNING_DEFAULT_PASSWORD || 'ChangeMe!123';

  const [author, learner] = await Promise.all([
    ensureUser(authorEmail, password, 'creator'),
    ensureUser(learnerEmail, password, 'user'),
  ]);

  const courseData = buildCourse(author.id);

  const tagCreates = courseData.tags?.create ?? [];
  const sectionCreates = courseData.sections?.create ?? [];

  const course = await prisma.course.upsert({
    where: { slug: courseData.slug },
    update: {
      title: courseData.title,
      subtitle: courseData.subtitle,
      description: courseData.description,
      level: courseData.level,
      visibility: courseData.visibility,
      status: courseData.status,
      language: courseData.language,
      track: courseData.track,
      estimatedMinutes: courseData.estimatedMinutes,
      publishedAt: courseData.publishedAt,
      author: { connect: { id: author.id } },
      tags: { deleteMany: {}, create: tagCreates },
      sections: { deleteMany: {}, create: sectionCreates },
    },
    create: courseData,
    include: { sections: { include: { lessons: true } }, tags: true },
  });

  console.log('Course ready:', course.slug, course.sections.length, 'sections');

  const enrollment = await prisma.enrollment.upsert({
    where: { courseId_userId: { courseId: course.id, userId: learner.id } },
    update: {},
    create: {
      courseId: course.id,
      userId: learner.id,
      status: 'ACTIVE',
      startedAt: new Date(),
      progress: { create: { lessonState: {}, percent: 0 } },
    },
  });

  await prisma.progress.upsert({
    where: { enrollmentId: enrollment.id },
    update: {},
    create: { enrollmentId: enrollment.id, lessonState: {}, percent: 0 },
  });

  console.log('Author:', author.email, '\nLearner enrolled:', learner.email);
}

main()
  .catch((err) => {
    console.error('Seeding failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
