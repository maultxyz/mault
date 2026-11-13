const NEXT_ASSEMBLY_USAGE_OCCURRENCE = "NEXT_ASSEMBLY_USAGE_OCCURRENCE";
const PRESENTATION = "MECHANICAL_DESIGN_GEOMETRIC_PRESENTATION_REPRESENTATION";
const SHAPE_REPRESENTATION_RELATIONSHIP = "SHAPE_REPRESENTATION_RELATIONSHIP";
const OVERRIDING_STYLED_ITEM = "CONTEXT_DEPENDENT_OVER_RIDING_STYLED_ITEM";
const CONDITIONAL_ROOT_TYPES = new Set([PRESENTATION, SHAPE_REPRESENTATION_RELATIONSHIP, OVERRIDING_STYLED_ITEM]);

function parseEntities(data) {
  const entities = new Map();
  let cursor = 0;
  while (cursor < data.length) {
    const hash = data.indexOf("#", cursor);
    if (hash < 0) break;
    let end = hash;
    let inString = false;
    for (; end < data.length; end++) {
      const character = data[end];
      if (character === "'") inString = !inString;
      else if (character === ";" && !inString) break;
    }
    const body = data.slice(hash, end);
    cursor = end + 1;
    const equals = body.indexOf("=");
    const definition = body.slice(equals + 1).trimStart();
    entities.set(Number(body.slice(1, equals)), {
      body,
      type: definition.startsWith("(") ? "" : definition.match(/^[A-Z_0-9]+/)[0],
      references: [...definition.replace(/'[^']*'/g, "").matchAll(/#(\d+)/g)].map((match) => Number(match[1])),
    });
  }
  return entities;
}

export function pruneStepOccurrences(text, shouldPruneOccurrence) {
  const dataStart = text.indexOf("DATA;") + "DATA;".length;
  const dataEnd = text.lastIndexOf("ENDSEC;");
  const entities = parseEntities(text.slice(dataStart, dataEnd));

  const referrers = new Map();
  for (const [id, entity] of entities)
    for (const reference of entity.references) {
      if (!referrers.has(reference)) referrers.set(reference, []);
      referrers.get(reference).push(id);
    }

  const deleted = new Set();
  const isStillUsedAsChild = (productDefinition) =>
    (referrers.get(productDefinition) ?? []).some((id) => {
      const entity = entities.get(id);
      return !deleted.has(id) && entity.type === NEXT_ASSEMBLY_USAGE_OCCURRENCE && entity.references[1] === productDefinition;
    });
  const pendingDeletes = [...entities]
    .filter(([, entity]) => entity.type === NEXT_ASSEMBLY_USAGE_OCCURRENCE)
    .filter(([, entity]) => shouldPruneOccurrence(entity.body.match(/\(\s*'([^']*)'/)[1].replace(/:\d+$/, "")))
    .map(([id]) => id);
  while (pendingDeletes.length) {
    const id = pendingDeletes.pop();
    if (deleted.has(id)) continue;
    deleted.add(id);
    const entity = entities.get(id);
    if (entity.type === NEXT_ASSEMBLY_USAGE_OCCURRENCE && !isStillUsedAsChild(entity.references[1]))
      pendingDeletes.push(entity.references[1]);
    for (const referrer of referrers.get(id) ?? [])
      if (entities.get(referrer).type !== PRESENTATION) pendingDeletes.push(referrer);
  }

  const live = new Set();
  const markLive = (start) => {
    const stack = [start];
    while (stack.length) {
      const id = stack.pop();
      if (live.has(id) || deleted.has(id) || !entities.has(id)) continue;
      live.add(id);
      stack.push(...entities.get(id).references);
    }
  };
  const roots = [...entities.keys()].filter((id) => !referrers.has(id) && !deleted.has(id));
  for (const id of roots) if (!CONDITIONAL_ROOT_TYPES.has(entities.get(id).type)) markLive(id);

  let markedRelationship = true;
  while (markedRelationship) {
    markedRelationship = false;
    for (const id of roots) {
      const entity = entities.get(id);
      if (live.has(id) || entity.type !== SHAPE_REPRESENTATION_RELATIONSHIP) continue;
      if (entity.references.some((reference) => live.has(reference))) {
        markLive(id);
        markedRelationship = true;
      }
    }
  }

  for (const id of roots) {
    const entity = entities.get(id);
    if (entity.type === OVERRIDING_STYLED_ITEM && live.has(entity.references[1]) && entity.references.every((reference) => !deleted.has(reference)))
      markLive(id);
  }

  const presentationId = roots.find((id) => entities.get(id).type === PRESENTATION);
  if (presentationId !== undefined) {
    const presentation = entities.get(presentationId);
    const contextId = presentation.references.at(-1);
    const keptItems = presentation.references
      .slice(0, -1)
      .filter((id) => live.has(id) || live.has(entities.get(id)?.references.at(-1)));
    presentation.references = [...keptItems, contextId];
    presentation.body = `#${presentationId}=${PRESENTATION}('',(${keptItems.map((id) => `#${id}`).join(",")}),#${contextId})`;
    markLive(presentationId);
  }

  const keptBodies = [...entities].filter(([id]) => live.has(id)).map(([, entity]) => entity.body);
  return `${text.slice(0, dataStart)}\n${keptBodies.join(";\n")};\n${text.slice(dataEnd)}`;
}
