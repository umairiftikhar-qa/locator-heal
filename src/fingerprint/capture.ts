import type { Fingerprint } from './schema';

const MAX_TEXT_LENGTH = 200;

function normalizeText(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = value
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);

  return normalized.length > 0 ? normalized : undefined;
}

export function captureFingerprint(key: string, builder: string, builderArgs: unknown[], element: Element): Fingerprint {
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(element.attributes || [])) {
    if (attr.name === 'class' || attr.name === 'id') {
      continue;
    }
    attributes[attr.name] = attr.value;
  }

  const classList = Array.from(element.classList || []);

  const boundingBox = element.getBoundingClientRect();

  const domPath = buildDomPath(element);

  return {
    key,
    builder,
    builderArgs,
    testId: element.getAttribute('data-testid') ?? undefined,
    id: element.id || undefined,
    role: element.getAttribute('role') || undefined,
    ariaLabel: normalizeText(element.getAttribute('aria-label')),
    text: normalizeText(element.textContent || undefined),
    labelText: normalizeText(findLabelText(element)),
    name: normalizeText((element as HTMLInputElement).name || undefined),
    placeholder: normalizeText((element as HTMLInputElement).placeholder || undefined),
    tag: element.tagName.toLowerCase(),
    classList,
    attributes,
    domPath,
    siblingIndex: calculateSiblingIndex(element),
    boundingBox: Number.isFinite(boundingBox.width) && Number.isFinite(boundingBox.height)
      ? {
          x: boundingBox.x,
          y: boundingBox.y,
          w: boundingBox.width,
          h: boundingBox.height
        }
      : undefined,
    updatedAt: new Date().toISOString()
  };
}

function buildDomPath(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    let part = node.tagName.toLowerCase();
    if (node.id) {
      part += `#${node.id}`;
    } else if (node.classList.length > 0) {
      part += `.${Array.from(node.classList).join('.')}`;
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

function calculateSiblingIndex(element: Element): number {
  if (!element.parentElement) {
    return 0;
  }
  return Array.from(element.parentElement.children).indexOf(element);
}

function findLabelText(element: Element): string | undefined {
  const id = element.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) {
      return label.textContent?.trim() || undefined;
    }
  }

  let parent: Element | null = element.parentElement;
  while (parent) {
    if (parent.tagName.toLowerCase() === 'label') {
      return parent.textContent?.trim() || undefined;
    }
    parent = parent.parentElement;
  }

  return undefined;
}
