import { db } from '@/infrastructure/database/connection';
import { instruments, instrumentVersions, instrumentItems } from '@/domains/instrument/instrument.schema';
import { eq, desc } from 'drizzle-orm';

const ITEMS = [
  // Safety Domain (Items 1–22)
  { ordinal: 1, text: "I feel a consistent sense of inner peace.", domain: "safety", category: "feelings", scoreGroup: "safety_feelings", reverse: false },
  { ordinal: 2, text: "I believe that I can get my emotional needs met.", domain: "safety", category: "feelings", scoreGroup: "safety_feelings", reverse: false },
  { ordinal: 3, text: "I often feel anxious, even if I don't show it.", domain: "safety", category: "feelings", scoreGroup: "safety_feelings", reverse: true },
  { ordinal: 4, text: "It is hard for me to feel good when I'm being still.", domain: "safety", category: "feelings", scoreGroup: "safety_feelings", reverse: true },
  { ordinal: 5, text: "I am open to new ideas.", domain: "safety", category: "behaviours", scoreGroup: "safety_behaviours", reverse: false },
  { ordinal: 6, text: "I feel at ease in most situations.", domain: "safety", category: "behaviours", scoreGroup: "safety_behaviours", reverse: false },
  { ordinal: 7, text: "I am rigid in my views.", domain: "safety", category: "behaviours", scoreGroup: "safety_behaviours", reverse: true },
  { ordinal: 8, text: "I am on alert more often than not.", domain: "safety", category: "behaviours", scoreGroup: "safety_behaviours", reverse: true },
  { ordinal: 9, text: "I rarely seek new experiences.", domain: "safety", category: "excess", scoreGroup: "safety_excess", reverse: false },
  { ordinal: 10, text: "It takes me a long time to act on changes in my life.", domain: "safety", category: "excess", scoreGroup: "safety_excess", reverse: false },
  { ordinal: 11, text: "I am comfortable with experiencing the full range of my emotions.", domain: "safety", category: "dimension", dimension: "self", scoreGroup: "safety_self", reverse: false },
  { ordinal: 12, text: "I like who I am.", domain: "safety", category: "dimension", dimension: "self", scoreGroup: "safety_self", reverse: false },
  { ordinal: 13, text: "I regularly spend time alone to reflect on who I am.", domain: "safety", category: "dimension", dimension: "self", scoreGroup: "safety_self", reverse: false },
  { ordinal: 14, text: "I am quick to point out flaws in people or situations, but not my own.", domain: "safety", category: "dimension", dimension: "self", scoreGroup: "safety_self", reverse: true },
  { ordinal: 15, text: "Once I have achieved something, I move on to the next goal immediately.", domain: "safety", category: "dimension", dimension: "self", scoreGroup: "safety_self", reverse: true },
  { ordinal: 16, text: "I often criticise myself in ways I would not say to others.", domain: "safety", category: "dimension", dimension: "self", scoreGroup: "safety_self", reverse: true },
  { ordinal: 17, text: "I feel comfortable and at ease in my relationships with others.", domain: "safety", category: "dimension", dimension: "others", scoreGroup: "safety_others", reverse: false },
  { ordinal: 18, text: "I am accepted for who I am by people I surround myself with.", domain: "safety", category: "dimension", dimension: "others", scoreGroup: "safety_others", reverse: false },
  { ordinal: 19, text: "I keep people at a distance, even in my close relationships.", domain: "safety", category: "dimension", dimension: "others", scoreGroup: "safety_others", reverse: true },
  { ordinal: 20, text: "I always rely on myself even though I could easily ask for support.", domain: "safety", category: "dimension", dimension: "others", scoreGroup: "safety_others", reverse: true },
  { ordinal: 21, text: "I go out of my way to help others, often at personal cost to myself.", domain: "safety", category: "dimension", dimension: "others", scoreGroup: "safety_others", reverse: true },
  { ordinal: 22, text: "I am very careful not to upset people, even when I disagree with them or believe they are wrong.", domain: "safety", category: "dimension", dimension: "others", scoreGroup: "safety_others", reverse: true },

  // Challenge Domain (Items 23–44)
  { ordinal: 23, text: "I feel driven by deep purpose almost everyday.", domain: "challenge", category: "feelings", scoreGroup: "challenge_feelings", reverse: false },
  { ordinal: 24, text: "I can pursue goals that are meaningful to me.", domain: "challenge", category: "feelings", scoreGroup: "challenge_feelings", reverse: false },
  { ordinal: 25, text: "I feel like whatever I pursue is ultimately pointless.", domain: "challenge", category: "feelings", scoreGroup: "challenge_feelings", reverse: true },
  { ordinal: 26, text: "I can't choose what I want to do, for whatever reason.", domain: "challenge", category: "feelings", scoreGroup: "challenge_feelings", reverse: true },
  { ordinal: 27, text: "I consistently work on my goals.", domain: "challenge", category: "behaviours", scoreGroup: "challenge_behaviours", reverse: false },
  { ordinal: 28, text: "I work toward my goals even when it gets hard, because this is the right direction for me.", domain: "challenge", category: "behaviours", scoreGroup: "challenge_behaviours", reverse: false },
  { ordinal: 29, text: "I tend to avoid working on my current goals.", domain: "challenge", category: "behaviours", scoreGroup: "challenge_behaviours", reverse: true },
  { ordinal: 30, text: "I pursue the current goals in my life more because I have to than because I want to.", domain: "challenge", category: "behaviours", scoreGroup: "challenge_behaviours", reverse: true },
  { ordinal: 31, text: "I find it hard to take a break from working on my goals.", domain: "challenge", category: "excess", scoreGroup: "challenge_excess", reverse: false },
  { ordinal: 32, text: "I would sacrifice anything to achieve my goals.", domain: "challenge", category: "excess", scoreGroup: "challenge_excess", reverse: false },
  { ordinal: 33, text: "I feel at peace with my past.", domain: "challenge", category: "dimension", dimension: "past", scoreGroup: "challenge_past", reverse: false },
  { ordinal: 34, text: "I have a strong sense of personal identity.", domain: "challenge", category: "dimension", dimension: "past", scoreGroup: "challenge_past", reverse: false },
  { ordinal: 35, text: "I am comfortable exploring how situations in my past affect my behaviours now.", domain: "challenge", category: "dimension", dimension: "past", scoreGroup: "challenge_past", reverse: false },
  { ordinal: 36, text: "I have a clear understanding of how situations in my past impact who I am today.", domain: "challenge", category: "dimension", dimension: "past", scoreGroup: "challenge_past", reverse: false },
  { ordinal: 37, text: "I exaggerate or omit significant aspects of my past to portray myself differently.", domain: "challenge", category: "dimension", dimension: "past", scoreGroup: "challenge_past", reverse: true },
  { ordinal: 38, text: "My current life is a total opposite of my past.", domain: "challenge", category: "dimension", dimension: "past", scoreGroup: "challenge_past", reverse: true },
  { ordinal: 39, text: "I am excited about the future.", domain: "challenge", category: "dimension", dimension: "future", scoreGroup: "challenge_future", reverse: false },
  { ordinal: 40, text: "I am empowered to shape my own future.", domain: "challenge", category: "dimension", dimension: "future", scoreGroup: "challenge_future", reverse: false },
  { ordinal: 41, text: "The goals I choose are mostly influenced by factors outside of what I want.", domain: "challenge", category: "dimension", dimension: "future", scoreGroup: "challenge_future", reverse: true },
  { ordinal: 42, text: "Even though some goals excite me to think about, I don't embark on them.", domain: "challenge", category: "dimension", dimension: "future", scoreGroup: "challenge_future", reverse: true },
  { ordinal: 43, text: "I push through no matter how tough things get, yet I don't feel more fulfilled.", domain: "challenge", category: "dimension", dimension: "future", scoreGroup: "challenge_future", reverse: true },
  { ordinal: 44, text: "I have pursued different big goals, yet I don't feel fulfilled by any of them.", domain: "challenge", category: "dimension", dimension: "future", scoreGroup: "challenge_future", reverse: true },

  // Play Domain (Items 45–66)
  { ordinal: 45, text: "I feel consistently present with steady levels of energy.", domain: "play", category: "feelings", scoreGroup: "play_feelings", reverse: false },
  { ordinal: 46, text: "I can be present and enjoy life's pleasurable moments.", domain: "play", category: "feelings", scoreGroup: "play_feelings", reverse: false },
  { ordinal: 47, text: "I feel numb, as if I am depleted of energy.", domain: "play", category: "feelings", scoreGroup: "play_feelings", reverse: true },
  { ordinal: 48, text: "Savouring the present is a waste of time.", domain: "play", category: "feelings", scoreGroup: "play_feelings", reverse: true },
  { ordinal: 49, text: "I engage in new activities even without set goals.", domain: "play", category: "behaviours", scoreGroup: "play_behaviours", reverse: false },
  { ordinal: 50, text: "I actively experience the present moment.", domain: "play", category: "behaviours", scoreGroup: "play_behaviours", reverse: false },
  { ordinal: 51, text: "New things seldom interest me.", domain: "play", category: "behaviours", scoreGroup: "play_behaviours", reverse: true },
  { ordinal: 52, text: "I feel dissociated from the present.", domain: "play", category: "behaviours", scoreGroup: "play_behaviours", reverse: true },
  { ordinal: 53, text: "When I find something I enjoy, I immerse myself in it excessively.", domain: "play", category: "excess", scoreGroup: "play_excess", reverse: false },
  { ordinal: 54, text: "I indulge in what feels good in moment, to the detriment of my other needs or obligations.", domain: "play", category: "excess", scoreGroup: "play_excess", reverse: false },
  { ordinal: 55, text: "I am comfortable with different bodily sensations.", domain: "play", category: "dimension", dimension: "senses", scoreGroup: "play_senses", reverse: false },
  { ordinal: 56, text: "I feel one with my body.", domain: "play", category: "dimension", dimension: "senses", scoreGroup: "play_senses", reverse: false },
  { ordinal: 57, text: "I regularly make time for activities that are pleasurable for my senses (e.g. cuisine, art, music, dance, touch).", domain: "play", category: "dimension", dimension: "senses", scoreGroup: "play_senses", reverse: false },
  { ordinal: 58, text: "When I achieve something, I reward myself with something enjoyable.", domain: "play", category: "dimension", dimension: "senses", scoreGroup: "play_senses", reverse: false },
  { ordinal: 59, text: "I tend to over-indulge, sometimes to the point of abuse (e.g. junk food, addiction, dangerous activities).", domain: "play", category: "dimension", dimension: "senses", scoreGroup: "play_senses", reverse: true },
  { ordinal: 60, text: "I constantly seek out new and intense experiences, even if they can be risky.", domain: "play", category: "dimension", dimension: "senses", scoreGroup: "play_senses", reverse: true },
  { ordinal: 61, text: "I enjoy exploring new ideas, areas, and activities.", domain: "play", category: "dimension", dimension: "perception", scoreGroup: "play_perception", reverse: false },
  { ordinal: 62, text: "My opinions or beliefs can change when I discover evidence that challenges them.", domain: "play", category: "dimension", dimension: "perception", scoreGroup: "play_perception", reverse: false },
  { ordinal: 63, text: "I am inclusive of people who don't share my beliefs.", domain: "play", category: "dimension", dimension: "perception", scoreGroup: "play_perception", reverse: false },
  { ordinal: 64, text: "I tend to disregard others' perspectives.", domain: "play", category: "dimension", dimension: "perception", scoreGroup: "play_perception", reverse: true },
  { ordinal: 65, text: "When something new interests me, I explore it so deeply that I lose myself in it.", domain: "play", category: "dimension", dimension: "perception", scoreGroup: "play_perception", reverse: true },
  { ordinal: 66, text: "I often drop what I'm currently focused on and go toward something new that interests me.", domain: "play", category: "dimension", dimension: "perception", scoreGroup: "play_perception", reverse: true },
];

async function main() {
  console.log('--- Seeding Real Instrument ---');

  // 1. Find or create the instrument
  let [instrument] = await db.select().from(instruments).where(eq(instruments.slug, 'base-diagnostic')).limit(1);

  if (!instrument) {
    [instrument] = await db.insert(instruments).values({
      slug: 'base-diagnostic',
      name: 'The Dimensional System - Base Diagnostic',
      description: 'The complete 66-item dimensional assessment.',
      status: 'active',
    }).returning();
    console.log('Created instrument: base-diagnostic');
  } else {
    console.log('Found existing instrument: base-diagnostic');
  }

  // 2. Determine version number
  const [latestVersion] = await db.select()
    .from(instrumentVersions)
    .where(eq(instrumentVersions.instrumentId, instrument.id))
    .orderBy(desc(instrumentVersions.versionNumber))
    .limit(1);

  const versionNumber = (latestVersion?.versionNumber || 0) + 1;

  // 3. Create instrument version (empty config initially)
  const [version] = await db.insert(instrumentVersions).values({
    instrumentId: instrument.id,
    versionNumber,
    itemCount: ITEMS.length,
    scoringStrategyKey: 'base-diagnostic-v2',
    isActive: true,
    publishedAt: new Date(),
  }).returning();
  console.log(`Created version ${versionNumber} (id: ${version.id})`);

  // 4. Insert items
  const itemIdsMap = new Map<number, string>();
  for (const itemData of ITEMS) {
    const [item] = await db.insert(instrumentItems).values({
      instrumentVersionId: version.id,
      ordinal: itemData.ordinal,
      itemText: itemData.text,
      locale: 'en',
      responseFormat: 'likert_5',
      domainTag: itemData.domain,
      dimensionTag: itemData.dimension || null,
      categoryTag: itemData.category,
      scoreGroupTag: itemData.scoreGroup,
      configJson: { reverseScored: itemData.reverse, weight: 1 },
    }).returning();
    itemIdsMap.set(itemData.ordinal, item.id);
  }
  console.log(`Inserted ${ITEMS.length} items.`);

  // 5. Build scoring config
  const itemRules = ITEMS.map(item => ({
    itemId: itemIdsMap.get(item.ordinal)!,
    domain: item.domain,
    dimension: item.dimension,
    category: item.category,
    scoreGroup: item.scoreGroup,
    weight: 1,
    reverseScored: item.reverse,
    maxResponseValue: 5,
  }));

  const configJson = {
    version: 2,
    instrumentSlug: "base-diagnostic",
    responseScale: { min: 1, max: 5, type: "likert" },
    scoreGroups: [
      { key: "safety_feelings", label: "Safety Feelings", domain: "safety", category: "feelings", aggregation: "sum", rawScoreRange: { min: 4, max: 20 }, normalise: true },
      { key: "safety_behaviours", label: "Safety Behaviours", domain: "safety", category: "behaviours", aggregation: "sum", rawScoreRange: { min: 4, max: 20 }, normalise: true },
      { key: "safety_excess", label: "Safety Excess", domain: "safety", category: "excess", aggregation: "sum", rawScoreRange: { min: 2, max: 10 }, normalise: true },
      { key: "safety_self", label: "Safety Self", domain: "safety", category: "dimension", dimension: "self", aggregation: "sum", rawScoreRange: { min: 6, max: 30 }, normalise: true },
      { key: "safety_others", label: "Safety Others", domain: "safety", category: "dimension", dimension: "others", aggregation: "sum", rawScoreRange: { min: 6, max: 30 }, normalise: true },
      { key: "challenge_feelings", label: "Challenge Feelings", domain: "challenge", category: "feelings", aggregation: "sum", rawScoreRange: { min: 4, max: 20 }, normalise: true },
      { key: "challenge_behaviours", label: "Challenge Behaviours", domain: "challenge", category: "behaviours", aggregation: "sum", rawScoreRange: { min: 4, max: 20 }, normalise: true },
      { key: "challenge_excess", label: "Challenge Excess", domain: "challenge", category: "excess", aggregation: "sum", rawScoreRange: { min: 2, max: 10 }, normalise: true },
      { key: "challenge_past", label: "Challenge Past", domain: "challenge", category: "dimension", dimension: "past", aggregation: "sum", rawScoreRange: { min: 6, max: 30 }, normalise: true },
      { key: "challenge_future", label: "Challenge Future", domain: "challenge", category: "dimension", dimension: "future", aggregation: "sum", rawScoreRange: { min: 6, max: 30 }, normalise: true },
      { key: "play_feelings", label: "Play Feelings", domain: "play", category: "feelings", aggregation: "sum", rawScoreRange: { min: 4, max: 20 }, normalise: true },
      { key: "play_behaviours", label: "Play Behaviours", domain: "play", category: "behaviours", aggregation: "sum", rawScoreRange: { min: 4, max: 20 }, normalise: true },
      { key: "play_excess", label: "Play Excess", domain: "play", category: "excess", aggregation: "sum", rawScoreRange: { min: 2, max: 10 }, normalise: true },
      { key: "play_senses", label: "Play Senses", domain: "play", category: "dimension", dimension: "senses", aggregation: "sum", rawScoreRange: { min: 6, max: 30 }, normalise: true },
      { key: "play_perception", label: "Play Perception", domain: "play", category: "dimension", dimension: "perception", aggregation: "sum", rawScoreRange: { min: 6, max: 30 }, normalise: true }
    ],
    computedFields: [
      { key: "safety_overall_score", label: "Safety Overall Domain Score", domain: "safety", formula: { type: "average", inputs: [ { sourceKey: "safety_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "safety_behaviours", sourceType: "score_group", useValue: "raw" } ] }, outputType: "numeric" },
      { key: "safety_overall_pct", label: "Safety Overall Domain Percentage", domain: "safety", formula: { type: "custom_expression", inputs: [ { sourceKey: "safety_overall_score", sourceType: "computed_field", useValue: "raw" } ], expression: "($0 - 4) / (20 - 4) * 100" }, outputType: "percentage" },
      { key: "safety_alignment_diff", label: "Safety Alignment Difference", domain: "safety", formula: { type: "absolute_difference", inputs: [ { sourceKey: "safety_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "safety_behaviours", sourceType: "score_group", useValue: "raw" } ] }, outputType: "numeric" },
      { key: "safety_alignment_pct", label: "Safety Alignment Percentage", domain: "safety", formula: { type: "custom_expression", inputs: [ { sourceKey: "safety_alignment_diff", sourceType: "computed_field", useValue: "raw" } ], expression: "(16 - $0) / 16 * 100" }, outputType: "percentage" },
      { key: "safety_skew", label: "Safety Feeling/Behaviour Skew", domain: "safety", formula: { type: "custom_expression", inputs: [ { sourceKey: "safety_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "safety_behaviours", sourceType: "score_group", useValue: "raw" } ], expression: "$0 == $1 ? 0 : ($0 > $1 ? 1 : 2)" }, outputType: "numeric", directionLogic: { positiveLabel: "feeling_higher", negativeLabel: "behaviour_higher", neutralLabel: "equal", neutralThreshold: 0.5 } },
      { key: "safety_dim_average", label: "Safety Dimension Average", domain: "safety", formula: { type: "average", inputs: [ { sourceKey: "safety_self", sourceType: "score_group", useValue: "percentage" }, { sourceKey: "safety_others", sourceType: "score_group", useValue: "percentage" } ] }, outputType: "percentage" },
      { key: "safety_attunement", label: "Safety Attunement", domain: "safety", formula: { type: "custom_expression", inputs: [ { sourceKey: "safety_overall_pct", sourceType: "computed_field", useValue: "raw" }, { sourceKey: "safety_dim_average", sourceType: "computed_field", useValue: "raw" } ], expression: "min($0, $1) / max($0, $1) * 100" }, outputType: "percentage" },
      { key: "safety_full_score", label: "Safety Full Domain Summary Score", domain: "safety", formula: { type: "custom_expression", inputs: [ { sourceKey: "safety_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "safety_behaviours", sourceType: "score_group", useValue: "raw" }, { sourceKey: "safety_self", sourceType: "score_group", useValue: "raw" }, { sourceKey: "safety_others", sourceType: "score_group", useValue: "raw" } ], expression: "$0 + $1 + $2 + $3" }, outputType: "numeric" },
      { key: "safety_full_pct", label: "Safety Full Domain Summary Percentage", domain: "safety", formula: { type: "custom_expression", inputs: [ { sourceKey: "safety_full_score", sourceType: "computed_field", useValue: "raw" } ], expression: "($0 - 20) / (100 - 20) * 100" }, outputType: "percentage" },
      { key: "challenge_overall_score", label: "Challenge Overall Domain Score", domain: "challenge", formula: { type: "average", inputs: [ { sourceKey: "challenge_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "challenge_behaviours", sourceType: "score_group", useValue: "raw" } ] }, outputType: "numeric" },
      { key: "challenge_overall_pct", label: "Challenge Overall Domain Percentage", domain: "challenge", formula: { type: "custom_expression", inputs: [ { sourceKey: "challenge_overall_score", sourceType: "computed_field", useValue: "raw" } ], expression: "($0 - 4) / (20 - 4) * 100" }, outputType: "percentage" },
      { key: "challenge_alignment_diff", label: "Challenge Alignment Difference", domain: "challenge", formula: { type: "absolute_difference", inputs: [ { sourceKey: "challenge_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "challenge_behaviours", sourceType: "score_group", useValue: "raw" } ] }, outputType: "numeric" },
      { key: "challenge_alignment_pct", label: "Challenge Alignment Percentage", domain: "challenge", formula: { type: "custom_expression", inputs: [ { sourceKey: "challenge_alignment_diff", sourceType: "computed_field", useValue: "raw" } ], expression: "(16 - $0) / 16 * 100" }, outputType: "percentage" },
      { key: "challenge_skew", label: "Challenge Feeling/Behaviour Skew", domain: "challenge", formula: { type: "custom_expression", inputs: [ { sourceKey: "challenge_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "challenge_behaviours", sourceType: "score_group", useValue: "raw" } ], expression: "$0 == $1 ? 0 : ($0 > $1 ? 1 : 2)" }, outputType: "numeric", directionLogic: { positiveLabel: "feeling_higher", negativeLabel: "behaviour_higher", neutralLabel: "equal", neutralThreshold: 0.5 } },
      { key: "challenge_dim_average", label: "Challenge Dimension Average", domain: "challenge", formula: { type: "average", inputs: [ { sourceKey: "challenge_past", sourceType: "score_group", useValue: "percentage" }, { sourceKey: "challenge_future", sourceType: "score_group", useValue: "percentage" } ] }, outputType: "percentage" },
      { key: "challenge_attunement", label: "Challenge Attunement", domain: "challenge", formula: { type: "custom_expression", inputs: [ { sourceKey: "challenge_overall_pct", sourceType: "computed_field", useValue: "raw" }, { sourceKey: "challenge_dim_average", sourceType: "computed_field", useValue: "raw" } ], expression: "min($0, $1) / max($0, $1) * 100" }, outputType: "percentage" },
      { key: "challenge_full_score", label: "Challenge Full Domain Summary Score", domain: "challenge", formula: { type: "custom_expression", inputs: [ { sourceKey: "challenge_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "challenge_behaviours", sourceType: "score_group", useValue: "raw" }, { sourceKey: "challenge_past", sourceType: "score_group", useValue: "raw" }, { sourceKey: "challenge_future", sourceType: "score_group", useValue: "raw" } ], expression: "$0 + $1 + $2 + $3" }, outputType: "numeric" },
      { key: "challenge_full_pct", label: "Challenge Full Domain Summary Percentage", domain: "challenge", formula: { type: "custom_expression", inputs: [ { sourceKey: "challenge_full_score", sourceType: "computed_field", useValue: "raw" } ], expression: "($0 - 20) / (100 - 20) * 100" }, outputType: "percentage" },
      { key: "play_overall_score", label: "Play Overall Domain Score", domain: "play", formula: { type: "average", inputs: [ { sourceKey: "play_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "play_behaviours", sourceType: "score_group", useValue: "raw" } ] }, outputType: "numeric" },
      { key: "play_overall_pct", label: "Play Overall Domain Percentage", domain: "play", formula: { type: "custom_expression", inputs: [ { sourceKey: "play_overall_score", sourceType: "computed_field", useValue: "raw" } ], expression: "($0 - 4) / (20 - 4) * 100" }, outputType: "percentage" },
      { key: "play_alignment_diff", label: "Play Alignment Difference", domain: "play", formula: { type: "absolute_difference", inputs: [ { sourceKey: "play_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "play_behaviours", sourceType: "score_group", useValue: "raw" } ] }, outputType: "numeric" },
      { key: "play_alignment_pct", label: "Play Alignment Percentage", domain: "play", formula: { type: "custom_expression", inputs: [ { sourceKey: "play_alignment_diff", sourceType: "computed_field", useValue: "raw" } ], expression: "(16 - $0) / 16 * 100" }, outputType: "percentage" },
      { key: "play_skew", label: "Play Feeling/Behaviour Skew", domain: "play", formula: { type: "custom_expression", inputs: [ { sourceKey: "play_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "play_behaviours", sourceType: "score_group", useValue: "raw" } ], expression: "$0 == $1 ? 0 : ($0 > $1 ? 1 : 2)" }, outputType: "numeric", directionLogic: { positiveLabel: "feeling_higher", negativeLabel: "behaviour_higher", neutralLabel: "equal", neutralThreshold: 0.5 } },
      { key: "play_dim_average", label: "Play Dimension Average", domain: "play", formula: { type: "average", inputs: [ { sourceKey: "play_senses", sourceType: "score_group", useValue: "percentage" }, { sourceKey: "play_perception", sourceType: "score_group", useValue: "percentage" } ] }, outputType: "percentage" },
      { key: "play_attunement", label: "Play Attunement", domain: "play", formula: { type: "custom_expression", inputs: [ { sourceKey: "play_overall_pct", sourceType: "computed_field", useValue: "raw" }, { sourceKey: "play_dim_average", sourceType: "computed_field", useValue: "raw" } ], expression: "min($0, $1) / max($0, $1) * 100" }, outputType: "percentage" },
      { key: "play_full_score", label: "Play Full Domain Summary Score", domain: "play", formula: { type: "custom_expression", inputs: [ { sourceKey: "play_feelings", sourceType: "score_group", useValue: "raw" }, { sourceKey: "play_behaviours", sourceType: "score_group", useValue: "raw" }, { sourceKey: "play_senses", sourceType: "score_group", useValue: "raw" }, { sourceKey: "play_perception", sourceType: "score_group", useValue: "raw" } ], expression: "$0 + $1 + $2 + $3" }, outputType: "numeric" },
      { key: "play_full_pct", label: "Play Full Domain Summary Percentage", domain: "play", formula: { type: "custom_expression", inputs: [ { sourceKey: "play_full_score", sourceType: "computed_field", useValue: "raw" } ], expression: "($0 - 20) / (100 - 20) * 100" }, outputType: "percentage" }
    ],
    domainBandThresholds: [
      { domain: "safety", bandThresholds: [ { band: "very_low", min: 0, max: 35 }, { band: "low", min: 35, max: 65 }, { band: "slightly_low", min: 65, max: 85 }, { band: "balanced", min: 85, max: 100.1 } ] },
      { domain: "challenge", bandThresholds: [ { band: "very_low", min: 0, max: 35 }, { band: "low", min: 35, max: 65 }, { band: "slightly_low", min: 65, max: 85 }, { band: "balanced", min: 85, max: 100.1 } ] },
      { domain: "play", bandThresholds: [ { band: "very_low", min: 0, max: 35 }, { band: "low", min: 35, max: 65 }, { band: "slightly_low", min: 65, max: 85 }, { band: "balanced", min: 85, max: 100.1 } ] }
    ],
    excessBandThresholds: [
      { scoreGroupKey: "safety_excess", bandThresholds: [ { band: "balanced", min: 2, max: 4 }, { band: "slightly_excessive", min: 4, max: 7 }, { band: "excessive", min: 7, max: 9 }, { band: "extremely_excessive", min: 9, max: 10.1 } ] },
      { scoreGroupKey: "challenge_excess", bandThresholds: [ { band: "balanced", min: 2, max: 4 }, { band: "slightly_excessive", min: 4, max: 7 }, { band: "excessive", min: 7, max: 9 }, { band: "extremely_excessive", min: 9, max: 10.1 } ] },
      { scoreGroupKey: "play_excess", bandThresholds: [ { band: "balanced", min: 2, max: 4 }, { band: "slightly_excessive", min: 4, max: 7 }, { band: "excessive", min: 7, max: 9 }, { band: "extremely_excessive", min: 9, max: 10.1 } ] }
    ],
    dimensionBandThresholds: [
      { scoreGroupKey: "safety_self", bandThresholds: [{ band: "very_low", min: 0, max: 35 }, { band: "low", min: 35, max: 65 }, { band: "slightly_low", min: 65, max: 85 }, { band: "balanced", min: 85, max: 100.1 }] },
      { scoreGroupKey: "safety_others", bandThresholds: [{ band: "very_low", min: 0, max: 35 }, { band: "low", min: 35, max: 65 }, { band: "slightly_low", min: 65, max: 85 }, { band: "balanced", min: 85, max: 100.1 }] },
      { scoreGroupKey: "challenge_past", bandThresholds: [{ band: "very_low", min: 0, max: 35 }, { band: "low", min: 35, max: 65 }, { band: "slightly_low", min: 65, max: 85 }, { band: "balanced", min: 85, max: 100.1 }] },
      { scoreGroupKey: "challenge_future", bandThresholds: [{ band: "very_low", min: 0, max: 35 }, { band: "low", min: 35, max: 65 }, { band: "slightly_low", min: 65, max: 85 }, { band: "balanced", min: 85, max: 100.1 }] },
      { scoreGroupKey: "play_senses", bandThresholds: [{ band: "very_low", min: 0, max: 35 }, { band: "low", min: 35, max: 65 }, { band: "slightly_low", min: 65, max: 85 }, { band: "balanced", min: 85, max: 100.1 }] },
      { scoreGroupKey: "play_perception", bandThresholds: [{ band: "very_low", min: 0, max: 35 }, { band: "low", min: 35, max: 65 }, { band: "slightly_low", min: 65, max: 85 }, { band: "balanced", min: 85, max: 100.1 }] }
    ],
    consistency: { enabled: true, method: "intra_domain_variance", threshold: 70, maxIntraDomainStdDev: 2.0 },
    itemRules,
  };

  // 6. Update instrument version with final config
  await db.update(instrumentVersions)
    .set({ configJson })
    .where(eq(instrumentVersions.id, version.id));

  console.log('--- Real Instrument Seeded Successfully ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
