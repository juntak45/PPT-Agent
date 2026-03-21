import { ArchitectureOverlayPlan, PositionedComponent, PositionedConnection, PositionedGroup } from './types';

type Box = { x: number; y: number; w: number; h: number };

function groupBoxes(layoutStyle: ArchitectureOverlayPlan['layoutStyle']): Record<string, Box> {
  if (layoutStyle === 'platform-stack') {
    return {
      'group-input': { x: 4, y: 20, w: 20, h: 18 },
      'group-customer': { x: 4, y: 40, w: 28, h: 36 },
      'group-wrtn': { x: 34, y: 20, w: 36, h: 56 },
      'group-ops': { x: 72, y: 20, w: 24, h: 24 },
      'group-analytics': { x: 72, y: 46, w: 24, h: 16 },
      'group-data': { x: 72, y: 64, w: 24, h: 12 },
    };
  }

  if (layoutStyle === 'layered-flow') {
    return {
      'group-input': { x: 4, y: 18, w: 18, h: 20 },
      'group-customer': { x: 24, y: 18, w: 24, h: 48 },
      'group-wrtn': { x: 50, y: 18, w: 28, h: 48 },
      'group-ops': { x: 80, y: 18, w: 16, h: 20 },
      'group-analytics': { x: 80, y: 40, w: 16, h: 14 },
      'group-data': { x: 24, y: 68, w: 72, h: 12 },
    };
  }

  return {
    'group-input': { x: 4, y: 20, w: 16, h: 46 },
    'group-customer': { x: 22, y: 20, w: 24, h: 46 },
    'group-wrtn': { x: 48, y: 20, w: 28, h: 46 },
    'group-ops': { x: 78, y: 20, w: 18, h: 24 },
    'group-analytics': { x: 78, y: 46, w: 18, h: 12 },
    'group-data': { x: 22, y: 68, w: 74, h: 10 },
  };
}

function colorTokenForGroup(groupId: string): PositionedGroup['colorToken'] {
  if (groupId === 'group-wrtn') return 'wrtn';
  if (groupId === 'group-analytics') return 'analytics';
  if (groupId === 'group-data') return 'shared';
  return 'customer';
}

function layoutItems(groupBox: Box, count: number): Array<{ x: number; y: number; w: number; h: number }> {
  if (count <= 1) {
    return [{ x: groupBox.x + 2, y: groupBox.y + 8, w: groupBox.w - 4, h: Math.max(12, groupBox.h - 12) }];
  }
  const rowHeight = Math.max(9, Math.floor((groupBox.h - 10) / count));
  return Array.from({ length: count }).map((_, index) => ({
    x: groupBox.x + 2,
    y: groupBox.y + 6 + index * rowHeight,
    w: groupBox.w - 4,
    h: rowHeight - 2,
  }));
}

export function buildPositionedModel(overlayPlan: ArchitectureOverlayPlan): {
  groups: PositionedGroup[];
  components: PositionedComponent[];
  connections: PositionedConnection[];
} {
  const boxes = groupBoxes(overlayPlan.layoutStyle);
  const groups: PositionedGroup[] = overlayPlan.groups.map((group) => ({
    ...group,
    ...boxes[group.id],
    colorToken: colorTokenForGroup(group.id),
  }));

  const componentGroups = new Map<string, PositionedComponent[]>();
  overlayPlan.extraction.customerComponents.forEach((component) => {
    const groupId = (() => {
      switch (component.type) {
        case 'channel':
          return 'group-input';
        case 'admin':
        case 'security':
          return 'group-ops';
        case 'analytics':
          return 'group-analytics';
        case 'data-store':
        case 'integration':
          return 'group-data';
        default:
          return 'group-customer';
      }
    })();
    const list = componentGroups.get(groupId) || [];
    list.push({
      ...component,
      groupId,
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      colorToken: groupId === 'group-data' ? 'shared' : 'customer',
      editable: true,
    });
    componentGroups.set(groupId, list);
  });

  overlayPlan.wrtnModules
    .filter((module) => module.enabled)
    .forEach((module) => {
      const list = componentGroups.get('group-wrtn') || [];
      list.push({
        id: module.id,
        label: module.label,
        type: 'wrtn-module',
        description: module.rationale,
        sourceEvidence: module.mappedToComponentIds,
        inferredFrom: 'reference',
        importance: 'high',
        groupId: 'group-wrtn',
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        colorToken: 'wrtn',
        editable: true,
      });
      componentGroups.set('group-wrtn', list);
    });

  const components = Array.from(componentGroups.entries()).flatMap(([groupId, list]) => {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return [];
    const slots = layoutItems(group, list.length);
    return list.map((component, index) => ({
      ...component,
      ...slots[index],
    }));
  });

  const anchorLookup = new Map<string, { x: number; y: number }>();
  components.forEach((component) => {
    anchorLookup.set(component.id, { x: component.x + component.w / 2, y: component.y + component.h / 2 });
  });
  groups.forEach((group) => {
    anchorLookup.set(`${group.id}-anchor`, { x: group.x + group.w / 2, y: group.y + group.h / 2 });
  });
  anchorLookup.set('group-analytics-anchor', {
    x: (boxes['group-analytics']?.x || 80) + (boxes['group-analytics']?.w || 16) / 2,
    y: (boxes['group-analytics']?.y || 40) + (boxes['group-analytics']?.h || 14) / 2,
  });

  const connections: PositionedConnection[] = overlayPlan.connections
    .map((connection) => {
      const from = anchorLookup.get(connection.from);
      const to = anchorLookup.get(connection.to);
      if (!from || !to) return null;
      const midX = (from.x + to.x) / 2;
      return {
        ...connection,
        points: [
          from,
          { x: midX, y: from.y },
          { x: midX, y: to.y },
          to,
        ],
      };
    })
    .filter((item): item is PositionedConnection => item !== null);

  return { groups, components, connections };
}
