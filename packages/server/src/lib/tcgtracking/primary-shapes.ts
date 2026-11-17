import {
  GUNDAM_EMPTY_FIELD,
  GUNDAM_RARITY_ALIASES,
  GUNDAM_ZONE_ORDER,
  ONE_PIECE_CHARACTER_TYPE,
  ONE_PIECE_RARITY_CODES,
  POKEMON_ABILITY_HEADER_PATTERN,
  POKEMON_ATTACK_HEADER_PATTERN,
  POKEMON_CATEGORY,
  POKEMON_ENERGY_LETTERS,
  POKEMON_ENERGY_TYPE,
  POKEMON_ENERGY_TYPES,
  POKEMON_STAGES,
  POKEMON_TRAINER_PREFIX_PATTERN,
  POKEMON_TRAINER_TYPES,
  RIFTBOUND_DOMAIN_ALIASES,
  RIFTBOUND_RUNE_SUPERTYPE,
  RIFTBOUND_RUNE_TYPE,
  RIFTBOUND_SUPERTYPES,
  TCGTRACKING_BRACKETED_TAG_PATTERN,
  TCGTRACKING_ENCLOSED_NAME_PATTERN,
  TCGTRACKING_EXT_KEYS,
  TCGTRACKING_PRINTED_SET_PREFIX_PATTERN,
} from "../constants/tcgtracking";
import type { TcgtrackingPrimaryShapedFieldsInput } from "../interfaces/tcgtracking";
import { extText, extValues } from "./fallback";

function plainText(html: string | undefined): string | undefined {
  return (
    html
      ?.replace(/\r/g, "")
      .replace(/<br\s*\/?>\n?/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim() || undefined
  );
}

function numberOrNull(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesOf(text: string | undefined, pattern: RegExp): string[] {
  return text ? [...text.matchAll(pattern)].map((match) => match[1].trim()) : [];
}

function setNameOf(input: TcgtrackingPrimaryShapedFieldsInput): string {
  return input.primarySetName ?? input.tcgtrackingSetName;
}

function printedNumberOf(input: TcgtrackingPrimaryShapedFieldsInput): string {
  return (
    extText(input.ext, TCGTRACKING_EXT_KEYS.number) ??
    input.product.number ??
    input.collectorNumber
  );
}

function gundamRarity(rarity: string | undefined | null): string {
  const compact = (rarity ?? "").replace(/\s+/g, "");
  const [, base = compact, plus = ""] = /^([A-Z]+)(\+*)$/.exec(compact) ?? [];
  const canonicalBase = GUNDAM_RARITY_ALIASES[base] ?? base;
  return plus ? `${canonicalBase} ${plus}` : canonicalBase;
}

function gundamZone(zones: string[]): string {
  const ordered = GUNDAM_ZONE_ORDER.filter((zone) => zones.includes(zone));
  const others = zones.filter((zone) => !GUNDAM_ZONE_ORDER.includes(zone));
  return [...ordered, ...others].join(" ") || GUNDAM_EMPTY_FIELD;
}

export function gundamPrimaryShape(
  input: TcgtrackingPrimaryShapedFieldsInput,
): Record<string, unknown> {
  const { ext } = input;
  const cardNumber = printedNumberOf(input);
  const setName = setNameOf(input);
  const trait = extText(ext, TCGTRACKING_EXT_KEYS.gundamTrait);
  const link = extText(ext, TCGTRACKING_EXT_KEYS.gundamLink);
  const effect = plainText(extText(ext, TCGTRACKING_EXT_KEYS.text));
  const timingMarkers = matchesOf(effect, TCGTRACKING_BRACKETED_TAG_PATTERN);
  const attackPoints = extText(ext, TCGTRACKING_EXT_KEYS.gundamAttackPoints);
  const hitPoints = extText(ext, TCGTRACKING_EXT_KEYS.gundamHitPoints);
  return {
    name: input.name,
    card_number: cardNumber,
    product_id: cardNumber,
    set_code: input.setCode,
    set_name: setName,
    where_to_get: `${setName} [${input.setCode}]`,
    rarity: gundamRarity(
      extText(ext, TCGTRACKING_EXT_KEYS.rarityCode) ?? input.product.rarity,
    ),
    card_type: (extValues(ext, TCGTRACKING_EXT_KEYS.type)[0] ?? "").toUpperCase(),
    color: extValues(ext, TCGTRACKING_EXT_KEYS.color).join(" ") || null,
    cost: numberOrNull(extText(ext, TCGTRACKING_EXT_KEYS.cost)),
    level: numberOrNull(extText(ext, TCGTRACKING_EXT_KEYS.gundamLevel)),
    ap: numberOrNull(attackPoints),
    hp: numberOrNull(hitPoints),
    sp: null,
    ap_raw: attackPoints ?? null,
    hp_raw: hitPoints ?? null,
    zone: gundamZone(extValues(ext, TCGTRACKING_EXT_KEYS.gundamZone)),
    trait: trait ?? GUNDAM_EMPTY_FIELD,
    traits: matchesOf(trait, TCGTRACKING_ENCLOSED_NAME_PATTERN),
    link: link ?? GUNDAM_EMPTY_FIELD,
    link_refs: matchesOf(link, TCGTRACKING_ENCLOSED_NAME_PATTERN),
    effect: effect ?? "",
    timing_markers: timingMarkers,
    keywords_text: timingMarkers.join(" ").toLowerCase() || null,
    keyword_effects: [],
    source_title: extText(ext, TCGTRACKING_EXT_KEYS.gundamSourceTitle) ?? null,
  };
}

function onePieceSetId(setCode: string): string {
  return setCode.replace(/^([A-Z]+)(\d+)$/, "$1-$2");
}

export function onePiecePrimaryShape(
  input: TcgtrackingPrimaryShapedFieldsInput,
): Record<string, unknown> {
  const { ext } = input;
  const cardNumber = printedNumberOf(input);
  const joined = (keys: readonly string[]) => extValues(ext, keys).join(" ") || null;
  const cardType = extValues(ext, TCGTRACKING_EXT_KEYS.type)[0] ?? null;
  const counter = numberOrNull(extText(ext, TCGTRACKING_EXT_KEYS.onePieceCounter));
  const rarityName = input.product.rarity ?? undefined;
  return {
    card_name: input.name,
    card_set_id: cardNumber,
    card_image_id: cardNumber,
    set_id: onePieceSetId(input.setCode),
    set_name: setNameOf(input),
    rarity:
      extText(ext, TCGTRACKING_EXT_KEYS.rarityCode) ??
      (rarityName ? (ONE_PIECE_RARITY_CODES[rarityName] ?? rarityName) : null),
    card_type: cardType,
    sub_types: joined(TCGTRACKING_EXT_KEYS.subtypes),
    card_color: joined(TCGTRACKING_EXT_KEYS.color),
    attribute: joined(TCGTRACKING_EXT_KEYS.onePieceAttribute),
    card_cost: extText(ext, TCGTRACKING_EXT_KEYS.cost) ?? null,
    card_power: extText(ext, TCGTRACKING_EXT_KEYS.power) ?? null,
    counter_amount: counter ?? (cardType === ONE_PIECE_CHARACTER_TYPE ? 0 : null),
    life: extText(ext, TCGTRACKING_EXT_KEYS.onePieceLife) ?? null,
    card_text: plainText(extText(ext, TCGTRACKING_EXT_KEYS.text)) ?? "",
    market_price: null,
    inventory_price: null,
  };
}

function riftboundCollectorNumber(collectorNumber: string): number | string {
  return /^\d+$/.test(collectorNumber) ? Number(collectorNumber) : collectorNumber;
}

export function riftboundPrimaryShape(
  input: TcgtrackingPrimaryShapedFieldsInput,
): Record<string, unknown> {
  const { ext } = input;
  const typeWords = extValues(ext, TCGTRACKING_EXT_KEYS.type).flatMap((value) =>
    value.split(/\s+/),
  );
  const type = typeWords.find((word) => !RIFTBOUND_SUPERTYPES.has(word)) ?? null;
  const supertype =
    type === RIFTBOUND_RUNE_TYPE
      ? RIFTBOUND_RUNE_SUPERTYPE
      : (typeWords.find((word) => RIFTBOUND_SUPERTYPES.has(word)) ?? null);
  return {
    name: input.name,
    collector_number: riftboundCollectorNumber(input.collectorNumber),
    set: { label: setNameOf(input), set_id: input.setCode },
    classification: {
      type,
      supertype,
      rarity: input.product.rarity ?? null,
      domain: extValues(ext, TCGTRACKING_EXT_KEYS.riftboundDomain).map(
        (domain) => RIFTBOUND_DOMAIN_ALIASES[domain] ?? domain,
      ),
    },
    attributes: {
      might: numberOrNull(extText(ext, TCGTRACKING_EXT_KEYS.riftboundMight)),
      power: numberOrNull(extText(ext, TCGTRACKING_EXT_KEYS.riftboundPowerCost)),
      energy: numberOrNull(extText(ext, TCGTRACKING_EXT_KEYS.riftboundEnergyCost)),
    },
    tags: extValues(ext, TCGTRACKING_EXT_KEYS.riftboundTag),
    text: {
      plain: plainText(extText(ext, TCGTRACKING_EXT_KEYS.text)) ?? "",
      flavour: plainText(extText(ext, TCGTRACKING_EXT_KEYS.flavorText)) ?? null,
    },
    media: { artist: extText(ext, TCGTRACKING_EXT_KEYS.artist) ?? null },
    tcgplayer_id: String(input.product.id),
  };
}

function pokemonAttackCost(cost: string): string[] {
  return [...cost].flatMap((symbol) =>
    /\d/.test(symbol)
      ? Array<string>(Number(symbol)).fill(POKEMON_ENERGY_LETTERS.C)
      : POKEMON_ENERGY_LETTERS[symbol]
        ? [POKEMON_ENERGY_LETTERS[symbol]]
        : [],
  );
}

function pokemonAttackOf(text: string | undefined): Record<string, unknown> | null {
  const plain = plainText(text);
  if (!plain) return null;
  const [header, ...effectLines] = plain.split("\n");
  const match = POKEMON_ATTACK_HEADER_PATTERN.exec(header.trim());
  if (!match) return { name: header.trim(), effect: effectLines.join("\n").trim() || undefined };
  const [, cost, name, damage] = match;
  return {
    cost: pokemonAttackCost(cost),
    name: name.trim(),
    ...(damage ? { damage: /^\d+$/.test(damage) ? Number(damage) : damage } : {}),
    ...(effectLines.join("\n").trim() ? { effect: effectLines.join("\n").trim() } : {}),
  };
}

function pokemonAbilitiesOf(text: string | undefined): Record<string, unknown>[] {
  if (!text) return [];
  const [header, ...effectLines] = text.split("\n");
  const match = POKEMON_ABILITY_HEADER_PATTERN.exec(header.trim());
  if (!match) return [{ effect: text }];
  return [{ type: match[1].trim(), name: match[2].trim(), effect: effectLines.join("\n").trim() }];
}

function pokemonSetName(input: TcgtrackingPrimaryShapedFieldsInput): string {
  return (
    input.primarySetName ??
    input.tcgtrackingSetName.replace(TCGTRACKING_PRINTED_SET_PREFIX_PATTERN, "")
  );
}

export function pokemonPrimaryShape(
  input: TcgtrackingPrimaryShapedFieldsInput,
): Record<string, unknown> {
  const { ext } = input;
  const [typePart = "", hpPart, stagePart] = (
    extText(ext, TCGTRACKING_EXT_KEYS.pokemonTypeHpStage) ?? ""
  )
    .split("/")
    .map((part) => part.trim());
  const [, , retreatPart] = (
    extText(ext, TCGTRACKING_EXT_KEYS.pokemonWeaknessResistanceRetreat) ?? ""
  )
    .split("/")
    .map((part) => part.trim());
  const cardTypes = extValues(ext, TCGTRACKING_EXT_KEYS.type);
  const typeWords = typePart.split(/\s+/).filter(Boolean);
  const types =
    typeWords.length && typeWords.every((word) => POKEMON_ENERGY_TYPES.has(word))
      ? typeWords
      : extValues(ext, TCGTRACKING_EXT_KEYS.pokemonEnergyType).filter((type) =>
          POKEMON_ENERGY_TYPES.has(type),
        );
  const kinds = [typePart, ...cardTypes].filter(Boolean);
  const category = types.length || cardTypes.includes(POKEMON_CATEGORY.pokemon)
    ? POKEMON_CATEGORY.pokemon
    : kinds.some((kind) => /energy/i.test(kind))
      ? POKEMON_CATEGORY.energy
      : kinds.length
        ? POKEMON_CATEGORY.trainer
        : undefined;
  const stage = stagePart || extText(ext, TCGTRACKING_EXT_KEYS.pokemonStage);
  const text = plainText(extText(ext, TCGTRACKING_EXT_KEYS.pokemonCardText));
  const attacks = TCGTRACKING_EXT_KEYS.pokemonAttacks
    .map((keys) => pokemonAttackOf(extText(ext, keys)))
    .filter((attack) => attack !== null);
  const hp = numberOrNull(hpPart || extText(ext, TCGTRACKING_EXT_KEYS.pokemonHp));
  const retreat = numberOrNull(
    retreatPart || extText(ext, TCGTRACKING_EXT_KEYS.pokemonRetreatCost),
  );
  const illustrator = extText(ext, TCGTRACKING_EXT_KEYS.artist);
  const isPokemon = category === POKEMON_CATEGORY.pokemon;
  const trainerType =
    category === POKEMON_CATEGORY.trainer
      ? kinds
          .map((kind) => POKEMON_TRAINER_TYPES[kind.replace(POKEMON_TRAINER_PREFIX_PATTERN, "").toLowerCase()])
          .find(Boolean)
      : undefined;
  const energyType =
    category === POKEMON_CATEGORY.energy
      ? kinds.some((kind) => /special/i.test(kind))
        ? POKEMON_ENERGY_TYPE.special
        : POKEMON_ENERGY_TYPE.basic
      : undefined;
  return {
    name: input.name,
    localId: input.collectorNumber,
    set: { id: input.setCode, name: pokemonSetName(input) },
    rarity: input.product.rarity ?? undefined,
    ...(category ? { category } : {}),
    ...(illustrator ? { illustrator } : {}),
    ...(isPokemon && types.length ? { types } : {}),
    ...(isPokemon && hp !== null ? { hp } : {}),
    ...(isPokemon && stage ? { stage: POKEMON_STAGES[stage.toLowerCase()] ?? stage } : {}),
    ...(isPokemon && retreat !== null ? { retreat } : {}),
    ...(isPokemon && attacks.length ? { attacks } : {}),
    ...(isPokemon && text ? { abilities: pokemonAbilitiesOf(text) } : {}),
    ...(!isPokemon && text ? { effect: text } : {}),
    ...(trainerType ? { trainerType } : {}),
    ...(energyType ? { energyType } : {}),
  };
}
