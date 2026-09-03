import type { Archetype } from "@/lib/types/character";

export type GenerationOption<T = string> = {
  value: T;
  weight?: number;
  archetypeWeights?: Partial<Record<Archetype, number>>;
  cues?: readonly string[];
};

export const constructiveArchetypes = [
  "playful",
  "shy",
  "confident",
  "calm",
  "warm",
  "mysterious",
  "flirty",
  "serious",
  "chaotic",
  "soft_spoken",
  "protective",
  "ambitious",
  "rebellious",
  "intellectual",
  "romantic",
  "sarcastic",
  "adventurous",
  "nurturing",
] as const satisfies readonly Archetype[];

export const flawedArchetypes = [
  "jealous",
  "insecure",
  "arrogant",
  "cynical",
  "avoidant",
  "clingy",
  "impulsive",
  "stubborn",
  "guarded",
  "moody",
  "competitive",
  "self_centered",
] as const satisfies readonly Archetype[];

export const personalityData = {
  traits: [
    { value: "observant", archetypeWeights: { shy: 3, intellectual: 2, guarded: 2 } },
    { value: "decisive", archetypeWeights: { confident: 3, ambitious: 2 } },
    { value: "compassionate", archetypeWeights: { warm: 3, nurturing: 3, protective: 2 } },
    { value: "curious", archetypeWeights: { intellectual: 3, adventurous: 2 } },
    { value: "wry", archetypeWeights: { sarcastic: 4, cynical: 2 } },
    { value: "restless", archetypeWeights: { chaotic: 3, impulsive: 3 } },
    { value: "disciplined", archetypeWeights: { serious: 3, competitive: 2 } },
    { value: "tender-hearted", archetypeWeights: { romantic: 3, warm: 2 } },
    { value: "private", archetypeWeights: { mysterious: 3, avoidant: 3 } },
    { value: "bold", archetypeWeights: { rebellious: 3, adventurous: 2 } },
  ],
  strengths: [
    { value: "notices details others miss", archetypeWeights: { shy: 2, intellectual: 2, guarded: 1 } },
    { value: "stays calm under pressure", archetypeWeights: { calm: 4, serious: 2 } },
    { value: "inspires trust through consistency", archetypeWeights: { warm: 2, protective: 3 } },
    { value: "learns unfamiliar systems quickly", archetypeWeights: { intellectual: 4, ambitious: 2 } },
    { value: "acts decisively when others hesitate", archetypeWeights: { confident: 3, adventurous: 2 } },
    { value: "reads the emotional temperature of a room", archetypeWeights: { nurturing: 3, romantic: 2 } },
    { value: "turns setbacks into practical plans", archetypeWeights: { ambitious: 3, competitive: 2 } },
    { value: "finds humor in tense situations", archetypeWeights: { playful: 3, sarcastic: 2 } },
  ],
  weaknesses: [
    { value: "hesitates to ask for help", archetypeWeights: { shy: 3, guarded: 3 } },
    { value: "treats compromise like defeat", archetypeWeights: { stubborn: 4, competitive: 3 } },
    { value: "acts before considering the fallout", archetypeWeights: { impulsive: 4, chaotic: 3 } },
    { value: "hides hurt behind sharp humor", archetypeWeights: { sarcastic: 3, cynical: 3 } },
    { value: "takes responsibility for everyone", archetypeWeights: { protective: 3, nurturing: 3 } },
    { value: "mistakes achievement for self-worth", archetypeWeights: { ambitious: 4, insecure: 2 } },
    { value: "withdraws when intimacy feels risky", archetypeWeights: { avoidant: 4, guarded: 3 } },
    { value: "needs reassurance but struggles to believe it", archetypeWeights: { clingy: 3, insecure: 4 } },
  ],
  fears: [
    { value: "being rejected after becoming vulnerable", archetypeWeights: { shy: 3, guarded: 3, insecure: 4 } },
    { value: "failing someone who depends on them", archetypeWeights: { protective: 4, nurturing: 3 } },
    { value: "losing control of their own future", archetypeWeights: { ambitious: 3, rebellious: 3 } },
    { value: "being ordinary and forgettable", archetypeWeights: { competitive: 3, arrogant: 2 } },
    { value: "discovering that their cynicism was justified", archetypeWeights: { cynical: 4, avoidant: 2 } },
    { value: "causing irreversible harm in a reckless moment", archetypeWeights: { impulsive: 4, chaotic: 2 } },
  ],
  desires: [
    { value: "a place where vigilance is no longer necessary", archetypeWeights: { guarded: 3, shy: 2 } },
    { value: "recognition earned on their own terms", archetypeWeights: { ambitious: 4, competitive: 3 } },
    { value: "a loyal bond that survives difficult truths", archetypeWeights: { protective: 3, romantic: 3 } },
    { value: "the freedom to reinvent themself", archetypeWeights: { rebellious: 3, adventurous: 3 } },
    { value: "answers to a mystery nobody else takes seriously", archetypeWeights: { intellectual: 3, mysterious: 3 } },
    { value: "permission to enjoy life without earning it first", archetypeWeights: { serious: 2, playful: 3 } },
  ],
  goals: [
    { value: "prove they can finish what they started", archetypeWeights: { ambitious: 4, stubborn: 2 } },
    { value: "protect a fragile community from an approaching threat", archetypeWeights: { protective: 4, nurturing: 2 } },
    { value: "uncover who benefited from a buried mistake", archetypeWeights: { intellectual: 3, mysterious: 3 } },
    { value: "build an honest relationship without abandoning independence", archetypeWeights: { romantic: 3, avoidant: 3 } },
    { value: "escape a role that others chose for them", archetypeWeights: { rebellious: 4, self_centered: 1 } },
    { value: "turn a personal talent into meaningful work", archetypeWeights: { confident: 2, ambitious: 3 } },
  ],
  values: [
    { value: "loyalty", archetypeWeights: { protective: 4, clingy: 2 } },
    { value: "honesty", archetypeWeights: { serious: 2, warm: 2 } },
    { value: "freedom", archetypeWeights: { rebellious: 4, adventurous: 3 } },
    { value: "mastery", archetypeWeights: { ambitious: 3, intellectual: 3 } },
    { value: "compassion", archetypeWeights: { nurturing: 4, warm: 3 } },
    { value: "self-reliance", archetypeWeights: { guarded: 3, avoidant: 2 } },
    { value: "fairness", archetypeWeights: { calm: 2, protective: 2 } },
    { value: "wonder", archetypeWeights: { playful: 3, adventurous: 3 } },
  ],
  habits: [
    { value: "rehearses difficult conversations in advance", archetypeWeights: { shy: 4, guarded: 2 } },
    { value: "keeps meticulous lists", archetypeWeights: { ambitious: 3, serious: 3 } },
    { value: "checks exits upon entering a room", archetypeWeights: { protective: 2, guarded: 4 } },
    { value: "fills silence with teasing observations", archetypeWeights: { playful: 3, sarcastic: 3 } },
    { value: "takes long walks when a problem will not resolve", archetypeWeights: { intellectual: 2, moody: 2 } },
    { value: "brings small comforts for other people", archetypeWeights: { nurturing: 4, warm: 3 } },
  ],
  quirks: [
    { value: "collects oddly specific local sayings", archetypeWeights: { adventurous: 2, playful: 2 } },
    { value: "straightens nearby objects while thinking", archetypeWeights: { serious: 3, intellectual: 2 } },
    { value: "names important possessions", archetypeWeights: { romantic: 2, playful: 2 } },
    { value: "answers compliments with suspicious questions", archetypeWeights: { insecure: 3, guarded: 3 } },
    { value: "remembers tiny details about people but forgets dates", archetypeWeights: { shy: 1, warm: 3 } },
    { value: "uses dramatic metaphors for ordinary inconveniences", archetypeWeights: { chaotic: 3, sarcastic: 2 } },
  ],
  summaries: [
    "{name} is {traits}, relying on an ability to {strength} while struggling because they {weakness}. They want {desire}.",
    "At heart, {name} is {traits}. Their greatest asset is that they {strength}, but they often {weakness}; beneath it all, they seek {desire}.",
    "{name} comes across as {traits}: someone who {strength}, yet privately {weakness}. Much of their behavior is driven by a wish for {desire}.",
  ],
} as const satisfies Record<string, readonly GenerationOption[] | readonly string[]>;

export const talentData = {
  talents: [
    { value: "pattern recognition", archetypeWeights: { intellectual: 4, serious: 1 } },
    { value: "crisis leadership", archetypeWeights: { confident: 3, protective: 3 } },
    { value: "persuasive storytelling", archetypeWeights: { playful: 2, flirty: 2, romantic: 2 } },
    { value: "mechanical improvisation", archetypeWeights: { adventurous: 2, rebellious: 2 } },
    { value: "medical first aid", archetypeWeights: { nurturing: 3, protective: 3 } },
    { value: "strategic planning", archetypeWeights: { ambitious: 3, serious: 3 } },
    { value: "social intuition", archetypeWeights: { warm: 3, nurturing: 2 } },
    { value: "stealth and quiet movement", archetypeWeights: { shy: 2, mysterious: 3 } },
    { value: "music by ear", archetypeWeights: { romantic: 2, soft_spoken: 2 } },
    { value: "competitive athletics", archetypeWeights: { competitive: 4, confident: 2 } },
  ],
  limitations: [
    { value: "performance drops sharply without preparation", archetypeWeights: { shy: 2, serious: 2 } },
    { value: "overlooks emotional consequences while solving technical problems", archetypeWeights: { intellectual: 3 } },
    { value: "takes unnecessary risks when challenged", archetypeWeights: { competitive: 3, impulsive: 3 } },
    { value: "cannot sustain peak effort for long", archetypeWeights: { ambitious: 2 } },
    { value: "struggles to teach skills that feel intuitive", archetypeWeights: { intellectual: 1, arrogant: 2 } },
    { value: "freezes when someone they love is in immediate danger", archetypeWeights: { protective: 3, insecure: 2 } },
    { value: "works poorly under rigid supervision", archetypeWeights: { rebellious: 4 } },
    { value: "needs quiet to concentrate", archetypeWeights: { shy: 2, intellectual: 2 } },
  ],
} as const satisfies Record<string, readonly GenerationOption[]>;

export const appearanceData = {
  faceExpressions: ["open", "angular", "soft", "weathered", "youthful", "composed"],
  faceDetails: ["an expressive brow", "a guarded half-smile", "high cheekbones", "a dimple that appears unexpectedly", "a steady gaze", "fine laugh lines"],
  hairColors: ["black", "dark brown", "chestnut", "auburn", "silver-blond", "copper", "deep blue-black"],
  hairStyles: ["cropped and practical", "shoulder-length and loosely tied", "long with uneven layers", "carefully braided", "tousled waves", "a neat undercut"],
  eyeColors: ["brown", "hazel", "gray", "green", "blue", "amber"],
  skinTones: ["porcelain", "fair", "olive", "warm brown", "deep brown", "sun-bronzed"],
  clothingStyles: [
    { value: "understated layers in muted colors", archetypeWeights: { shy: 3, guarded: 2 } },
    { value: "precise tailoring with one bold accent", archetypeWeights: { ambitious: 3, confident: 2 } },
    { value: "practical clothes chosen for movement", archetypeWeights: { adventurous: 3, protective: 2 } },
    { value: "soft textures and carefully kept accessories", archetypeWeights: { romantic: 3, warm: 2 } },
    { value: "mismatched pieces worn with confidence", archetypeWeights: { chaotic: 3, rebellious: 3 } },
    { value: "classic, severe silhouettes", archetypeWeights: { serious: 3, mysterious: 2 } },
  ],
  distinctiveFeatures: ["a small eyebrow scar", "ink-stained fingertips", "a deliberate, quiet posture", "a weathered wristwatch", "a bright streak in their hair", "callused palms", "a constellation of freckles", "an old signet ring"],
} as const;

export const speechData = {
  styles: [
    { value: "quiet and precise", archetypeWeights: { shy: 4, soft_spoken: 4, intellectual: 2 } },
    { value: "warm, direct, and reassuring", archetypeWeights: { warm: 4, nurturing: 3 } },
    { value: "measured with dry humor", archetypeWeights: { serious: 2, sarcastic: 4 } },
    { value: "quick, animated, and prone to tangents", archetypeWeights: { playful: 3, chaotic: 4 } },
    { value: "formal and strategically concise", archetypeWeights: { ambitious: 3, intellectual: 3 } },
    { value: "bold and openly challenging", archetypeWeights: { confident: 3, rebellious: 4 } },
    { value: "gentle until a boundary is crossed", archetypeWeights: { protective: 4, romantic: 2 } },
  ],
  catchphrases: [
    { value: "Give me a moment.", archetypeWeights: { shy: 2, intellectual: 2 } },
    { value: "We can work with this.", archetypeWeights: { calm: 3, confident: 2 } },
    { value: "That is not the same as impossible.", archetypeWeights: { ambitious: 3, stubborn: 2 } },
    { value: "You noticed that too?", archetypeWeights: { mysterious: 2, intellectual: 2 } },
    { value: "I have a terrible idea.", archetypeWeights: { chaotic: 4, playful: 3 } },
    { value: "Stay behind me.", archetypeWeights: { protective: 5 } },
    { value: "Try to keep up.", archetypeWeights: { competitive: 4, arrogant: 2 } },
    { value: "I was joking. Mostly.", archetypeWeights: { sarcastic: 4, guarded: 2 } },
  ],
  notes: [
    { value: "Pauses before vulnerable admissions and becomes more specific when trust rises.", archetypeWeights: { shy: 3, guarded: 3 } },
    { value: "Uses questions to guide others, but switches to short commands in danger.", archetypeWeights: { protective: 3, calm: 2 } },
    { value: "Speaks in polished sentences when composed and clipped fragments when frustrated.", archetypeWeights: { serious: 3, ambitious: 2 } },
    { value: "Deflects praise with humor; sincere statements are brief and unembellished.", archetypeWeights: { sarcastic: 3, insecure: 2 } },
    { value: "Talks rapidly while excited and circles back to correct missed details.", archetypeWeights: { chaotic: 3, playful: 2 } },
  ],
} as const satisfies Record<string, readonly GenerationOption[]>;

export const relationshipData = {
  preferredTraits: [
    { value: "emotional honesty", archetypeWeights: { guarded: 3, romantic: 3 } },
    { value: "quiet competence", archetypeWeights: { serious: 2, ambitious: 2 } },
    { value: "playful confidence", archetypeWeights: { shy: 3, playful: 2 } },
    { value: "steadfast loyalty", archetypeWeights: { protective: 4, jealous: 2 } },
    { value: "independence", archetypeWeights: { avoidant: 3, rebellious: 3 } },
    { value: "intellectual curiosity", archetypeWeights: { intellectual: 4 } },
    { value: "patience", archetypeWeights: { impulsive: 2, moody: 2 } },
  ],
  turnOns: ["thoughtful attention", "shared private jokes", "competence under pressure", "gentle teasing", "acts of courage", "earnest curiosity", "respect for boundaries"],
  turnOffs: ["casual cruelty", "dishonesty", "public humiliation", "controlling behavior", "reckless arrogance", "emotional manipulation", "dismissed boundaries"],
  notes: [
    "Needs {quality} before attraction becomes trust; responds best to {language}.",
    "Romantic interest grows through {quality}, especially when expressed through {language}.",
    "Values {quality} and treats {language} as the clearest sign of genuine care.",
  ],
} as const;

export const backgroundData = {
  birthplaces: [
    { value: "a crowded river-port district", cues: ["working", "trade", "travel"] },
    { value: "an isolated mountain town", cues: ["rural", "loss", "tradition"] },
    { value: "a wealthy capital neighborhood", cues: ["elite", "academy", "expectation"] },
    { value: "a remote agricultural settlement", cues: ["working", "family", "scarcity"] },
    { value: "a coastal city rebuilt after a great storm", cues: ["disaster", "community", "loss"] },
    { value: "a traveling household with no permanent hometown", cues: ["travel", "independence", "outsider"] },
  ],
  families: [
    { value: "Raised by a close-knit extended family who solve problems together.", cues: ["family", "community"] },
    { value: "Grew up with one demanding parent and an absent second parent.", cues: ["expectation", "abandonment"] },
    { value: "The eldest sibling in a loving but financially strained household.", cues: ["family", "working", "responsibility"] },
    { value: "Taken in by a mentor after losing contact with their birth family.", cues: ["loss", "mentor", "outsider"] },
    { value: "Born into a prominent family whose affection depends on achievement.", cues: ["elite", "expectation", "status"] },
    { value: "Raised communally among travelers, craftspeople, and seasonal workers.", cues: ["travel", "community", "trade"] },
  ],
  education: [
    { value: "self-taught through borrowed books and practical work", cues: ["working", "scarcity", "independence"] },
    { value: "formally trained at a competitive academy", cues: ["academy", "elite", "expectation"] },
    { value: "apprenticed to a patient local expert", cues: ["mentor", "trade", "community"] },
    { value: "educated at home with an uneven but unusually broad curriculum", cues: ["family", "outsider"] },
    { value: "left formal schooling early and learned through travel", cues: ["travel", "independence"] },
  ],
  socialClasses: [
    { value: "working class", cues: ["working", "trade", "scarcity"] },
    { value: "precarious middle class", cues: ["expectation", "working"] },
    { value: "established professional class", cues: ["academy", "status"] },
    { value: "wealthy but tightly controlled", cues: ["elite", "status", "expectation"] },
    { value: "social outsider with unstable resources", cues: ["outsider", "travel", "scarcity"] },
  ],
  events: [
    { value: "won a place in an institution that once excluded them", cues: ["academy", "status", "achievement"] },
    { value: "helped their community recover after a natural disaster", cues: ["disaster", "community", "responsibility"] },
    { value: "left home after a public disagreement with family", cues: ["family", "independence", "conflict"] },
    { value: "failed to protect a mentor during a political crackdown", cues: ["mentor", "loss", "guilt"] },
    { value: "turned a temporary job into a respected craft", cues: ["trade", "working", "achievement"] },
    { value: "returned from years of travel with a changed reputation", cues: ["travel", "outsider", "status"] },
  ],
  trauma: [
    { value: "carries guilt from a crisis in which every choice hurt someone", cues: ["guilt", "disaster", "responsibility"] },
    { value: "was abandoned without an explanation they could trust", cues: ["abandonment", "loss"] },
    { value: "endured years of affection being tied to achievement", cues: ["expectation", "status"] },
    { value: "lost their sense of safety during a forced displacement", cues: ["travel", "loss", "outsider"] },
  ],
  secrets: [
    { value: "quietly accepted help from the rival they publicly condemn", cues: ["status", "conflict"] },
    { value: "knows the official account of a past disaster is incomplete", cues: ["disaster", "guilt"] },
    { value: "has been sending money to an estranged relative", cues: ["family", "abandonment"] },
    { value: "used another person's recommendation to gain an opportunity", cues: ["academy", "achievement"] },
    { value: "plans to leave once a private obligation is fulfilled", cues: ["travel", "independence"] },
  ],
} as const satisfies Record<string, readonly GenerationOption[]>;

export const currentStateData = {
  physical: [
    { value: "rested but carrying persistent shoulder tension", cues: ["expectation", "responsibility"] },
    { value: "sleep-deprived and running on momentum", cues: ["achievement", "conflict"] },
    { value: "recovering from a minor injury they keep minimizing", cues: ["disaster", "guilt"] },
    { value: "healthy, alert, and unable to sit still", cues: ["travel", "independence"] },
    { value: "physically steady but overdue for a real meal", cues: ["scarcity", "working"] },
  ],
  emotional: [
    { value: "guardedly hopeful", archetypeWeights: { shy: 2, guarded: 3 }, cues: ["community", "family"] },
    { value: "frustrated by stalled progress", archetypeWeights: { ambitious: 4, competitive: 3 }, cues: ["achievement"] },
    { value: "protective and quietly afraid", archetypeWeights: { protective: 4, nurturing: 2 }, cues: ["loss", "family"] },
    { value: "energized by uncertainty", archetypeWeights: { adventurous: 4, chaotic: 2 }, cues: ["travel"] },
    { value: "lonely despite appearing self-sufficient", archetypeWeights: { avoidant: 3, guarded: 2 }, cues: ["outsider", "abandonment"] },
  ],
  mental: [
    { value: "focused on contingencies and worst-case outcomes", archetypeWeights: { protective: 2, serious: 3 }, cues: ["disaster", "responsibility"] },
    { value: "clear-headed except when the past is mentioned", archetypeWeights: { guarded: 3 }, cues: ["loss", "guilt"] },
    { value: "split between patience and an urge to act now", archetypeWeights: { impulsive: 3, ambitious: 2 }, cues: ["conflict"] },
    { value: "analytical but increasingly prone to tunnel vision", archetypeWeights: { intellectual: 4, competitive: 2 }, cues: ["achievement"] },
    { value: "open to connection while carefully testing motives", archetypeWeights: { warm: 2, shy: 2 }, cues: ["family", "abandonment"] },
  ],
  goals: [
    { value: "learn who is obstructing their next move", cues: ["conflict", "status"] },
    { value: "keep a vulnerable ally out of immediate danger", cues: ["family", "responsibility", "loss"] },
    { value: "secure the resources needed for an independent plan", cues: ["scarcity", "independence"] },
    { value: "repair a relationship before silence becomes permanent", cues: ["family", "abandonment"] },
    { value: "finish a difficult task before a public deadline", cues: ["achievement", "expectation"] },
  ],
  conflicts: [
    { value: "an ally wants honesty while they still believe secrecy is safer", cues: ["family", "guilt"] },
    { value: "their fastest route forward would harm the community they value", cues: ["community", "responsibility"] },
    { value: "a rival controls access to something they urgently need", cues: ["status", "conflict"] },
    { value: "returning home would solve one problem and revive another", cues: ["family", "abandonment", "loss"] },
    { value: "their body needs rest while circumstances demand action", cues: ["disaster", "achievement"] },
  ],
  locations: ["a nearly empty transit station", "a borrowed room above a busy shop", "the edge of a guarded civic district", "a familiar neighborhood that no longer feels safe", "a temporary camp outside the city", "a quiet archive after closing"],
} as const;

export const characterArcData = {
  initial: [
    { value: "They confuse self-protection with self-sufficiency.", cues: ["guarded", "outsider", "abandonment"] },
    { value: "They measure personal worth through visible achievement.", cues: ["achievement", "expectation", "competitive"] },
    { value: "They protect others to avoid confronting their own fear.", cues: ["protective", "family", "loss"] },
    { value: "They use charm and motion to stay ahead of consequences.", cues: ["playful", "chaotic", "travel"] },
    { value: "They assume difficult truths will destroy every relationship.", cues: ["secret", "guilt", "guarded"] },
  ],
  growth: [
    { value: "Learn to ask for help without treating dependence as failure.", cues: ["guarded", "outsider", "responsibility"] },
    { value: "Choose an honest life over a flawless reputation.", cues: ["achievement", "status", "secret"] },
    { value: "Protect others while respecting their agency.", cues: ["protective", "family"] },
    { value: "Turn restless courage into deliberate commitment.", cues: ["chaotic", "travel", "independence"] },
    { value: "Accept that vulnerability can strengthen rather than erase trust.", cues: ["abandonment", "guilt", "guarded"] },
  ],
  internal: [
    { value: "They want closeness but interpret needing someone as weakness.", cues: ["guarded", "abandonment", "family"] },
    { value: "They crave recognition yet resent the standards used to grant it.", cues: ["achievement", "expectation", "status"] },
    { value: "They cannot decide whether truth or protection matters more.", cues: ["secret", "protective", "guilt"] },
    { value: "They fear that slowing down will expose how uncertain they feel.", cues: ["chaotic", "travel", "conflict"] },
  ],
  external: [
    { value: "A powerful rival can expose the compromise behind their success.", cues: ["status", "achievement", "secret"] },
    { value: "A worsening crisis forces them to trust people they once excluded.", cues: ["disaster", "community", "guarded"] },
    { value: "Someone they protect chooses a path they consider dangerous.", cues: ["protective", "family", "conflict"] },
    { value: "An obligation at home collides with the future they are building elsewhere.", cues: ["family", "travel", "responsibility"] },
  ],
  milestones: [
    { value: "admitted one difficult truth without controlling the response", cues: ["secret", "guarded"] },
    { value: "accepted help during a crisis", cues: ["disaster", "responsibility"] },
    { value: "chose a relationship over a status advantage", cues: ["status", "family"] },
    { value: "set a boundary without disappearing", cues: ["abandonment", "conflict"] },
  ],
} as const satisfies Record<string, readonly GenerationOption[]>;
