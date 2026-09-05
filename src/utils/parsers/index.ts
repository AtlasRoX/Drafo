import { FlowProject } from '../../types/flow';
import { parseMermaid } from './mermaidParser';
import { parseUML } from './umlParser';
import { parseSQL } from './sqlParser';
import { parseJSON } from './jsonParser';
import { parseTypeDefinitions } from './typeParser';

export type SupportedFormat = 'mermaid' | 'uml' | 'sql' | 'json' | 'types' | 'graphql';

/**
 * Intelligent Auto-Detection of Code / Schema format
 */
export function autoDetectFormat(code: string): SupportedFormat {
  const trimmed = code.trim();

  // 1. Mermaid
  if (
    /^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|stateDiagram|gantt|pie|gitGraph)\b/i.test(trimmed) ||
    trimmed.includes('subgraph ') ||
    /-->|---\|==>|-\.->/.test(trimmed)
  ) {
    return 'mermaid';
  }

  // 2. PlantUML / UML
  if (
    trimmed.startsWith('@startuml') ||
    trimmed.includes('@enduml') ||
    /<\|--|<\|\.\.|\.\.\|>|\*--|o--/.test(trimmed) ||
    (/class\s+[a-zA-Z0-9_]+\s*\{/i.test(trimmed) && !trimmed.includes('export ')) ||
    /\[[a-zA-Z0-9_\s]+\]\s*-->/.test(trimmed)
  ) {
    return 'uml';
  }

  // 3. SQL DDL
  if (
    /\bCREATE\s+TABLE\b/i.test(trimmed) ||
    /\bALTER\s+TABLE\b/i.test(trimmed) ||
    (/\bPRIMARY\s+KEY\b/i.test(trimmed) && /\bREFERENCES\b/i.test(trimmed))
  ) {
    return 'sql';
  }

  // 4. JSON
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // not valid JSON
    }
  }

  // 5. GraphQL
  if (
    /\btype\s+Query\b/i.test(trimmed) ||
    /\btype\s+Mutation\b/i.test(trimmed) ||
    /\bschema\s*\{/i.test(trimmed) ||
    (/\btype\s+[a-zA-Z0-9_]+\s*\{/i.test(trimmed) && trimmed.includes('!'))
  ) {
    return 'graphql';
  }

  // 6. TypeScript Interfaces / Types
  if (
    /\binterface\s+[a-zA-Z0-9_]+\s*\{/i.test(trimmed) ||
    /\btype\s+[a-zA-Z0-9_]+\s*=\s*\{/i.test(trimmed)
  ) {
    return 'types';
  }

  // Default fallback
  return 'mermaid';
}

/**
 * Universal Unified Parser
 */
export function parseToFlowProject(
  format: SupportedFormat | 'auto',
  code: string,
  options: { direction?: 'LR' | 'TB' } = {}
): FlowProject {
  const resolvedFormat = format === 'auto' ? autoDetectFormat(code) : format;
  const dir = options.direction || 'LR';

  switch (resolvedFormat) {
    case 'mermaid':
      return parseMermaid(code, dir);
    case 'uml':
      return parseUML(code, dir);
    case 'sql':
      return parseSQL(code, dir);
    case 'json':
      return parseJSON(code, dir);
    case 'types':
    case 'graphql':
      return parseTypeDefinitions(code, dir);
    default:
      return parseMermaid(code, dir);
  }
}

export { parseMermaid, parseUML, parseSQL, parseJSON, parseTypeDefinitions };
