export function buildOrgTree(employees, search) {
  const q = search?.toLowerCase().trim() || '';
  const empMap = new Map();
  const roots = [];

  employees.forEach(e => {
    empMap.set(e.id, { ...e, children: [] });
  });

  employees.forEach(e => {
    const node = empMap.get(e.id);
    const parent = e.supervisor_id && empMap.get(e.supervisor_id);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  if (!q) return roots;

  const hasVisibleDescendant = (node) => {
    if (node.name.toLowerCase().includes(q)) return true;
    return node.children.some(child => hasVisibleDescendant(child));
  };

  const filterTree = (nodes) => {
    return nodes.filter(n => {
      n.children = filterTree(n.children);
      return hasVisibleDescendant(n);
    });
  };

  return filterTree(roots);
}

export function calcTreeLayout(roots, cardWidth = 200, gap = 40, levelHeight = 120) {
  const positions = new Map();
  const slotWidth = cardWidth + gap;

  function countLeaves(node) {
    if (!node.children || node.children.length === 0) return 1;
    return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
  }

  function assignSlots(node, slotStart) {
    const leaves = countLeaves(node);
    if (!node.children || node.children.length === 0) {
      node._slot = slotStart;
      node._span = 1;
      return leaves;
    }
    let currentSlot = slotStart;
    node.children.forEach(child => {
      const childLeaves = assignSlots(child, currentSlot);
      currentSlot += childLeaves;
    });
    const firstSlot = slotStart;
    const lastSlot = slotStart + leaves - 1;
    node._slot = (firstSlot + lastSlot) / 2;
    node._span = leaves;
    return leaves;
  }

  function positionNodes(node, level) {
    const x = (node._slot + 0.5) * slotWidth;
    const y = level * levelHeight;
    positions.set(node.id, { x, y, node });

    if (node.children) {
      node.children.forEach(child => positionNodes(child, level + 1));
    }
  }

  let slotCursor = 0;
  roots.forEach(root => {
    assignSlots(root, slotCursor);
    slotCursor += root._span || 1;
  });
  roots.forEach(root => positionNodes(root, 0));

  return positions;
}
