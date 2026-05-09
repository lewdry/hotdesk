const BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'LI', 'DIV']);

function findBlock(editor, node) {
  let n = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (n && n !== editor) {
    if (BLOCKS.has(n.tagName)) return n;
    n = n.parentElement;
  }
  return null;
}

function inBlockquote() {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return false;
  const n  = sel.getRangeAt(0).startContainer;
  const el = n.nodeType === Node.TEXT_NODE ? n.parentElement : n;
  return !!el?.closest?.('blockquote');
}

export function applyFormat(fmt, editor, active, handleInput) {
  if (!editor) return;
  editor.focus();

  switch (fmt) {
    case 'bold':          toggleInlineFormat(editor, 'strong', ['strong', 'b'],         active.bold);          break;
    case 'italic':        toggleInlineFormat(editor, 'em',     ['em', 'i'],              active.italic);        break;
    case 'strikethrough': toggleInlineFormat(editor, 'del',    ['del', 's', 'strike'],  active.strikethrough); break;
    case 'bullet':
      toggleList(editor, 'ul', active.bullet);
      break;
    case 'ordered':
      toggleList(editor, 'ol', active.ordered);
      break;
    case 'body': changeBlockFormat(editor, 'p'); break;
    case 'h1':   changeBlockFormat(editor, active.h1 ? 'p' : 'h1'); break;
    case 'h2':   changeBlockFormat(editor, active.h2 ? 'p' : 'h2'); break;
    case 'quote': toggleBlockquote(editor); break;
  }

  handleInput();
}

function toggleInlineFormat(editor, tagName, matchTags, isActive) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  if (isActive) {
    let n = range.startContainer;
    if (n.nodeType === Node.TEXT_NODE) n = n.parentElement;
    const wrapper = n.closest(matchTags.join(','));
    if (!wrapper || !editor.contains(wrapper)) return;
    const frag = document.createDocumentFragment();
    while (wrapper.firstChild) frag.appendChild(wrapper.firstChild);
    wrapper.replaceWith(frag);
  } else {
    const el = document.createElement(tagName);
    try {
      range.surroundContents(el);
    } catch {
      const extracted = range.extractContents();
      el.appendChild(extracted);
      range.insertNode(el);
    }
    const r = document.createRange();
    r.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}

function getSelectedBlocks(editor, range) {
  if (!editor) return [];
  if (range.collapsed) {
    const b = findBlock(editor, range.startContainer);
    return b ? [b] : [];
  }

  const blocks = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) => {
      if (!BLOCKS.has(node.tagName)) return NodeFilter.FILTER_SKIP;
      if (range.intersectsNode(node)) return NodeFilter.FILTER_ACCEPT;
      return NodeFilter.FILTER_SKIP;
    }
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    blocks.push(currentNode);
    currentNode = walker.nextNode();
  }
  
  if (blocks.length === 0) {
    const b = findBlock(editor, range.startContainer);
    if (b) blocks.push(b);
  }
  return blocks;
}

function changeBlockFormat(editor, tagName) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  const blocks = getSelectedBlocks(editor, range);
  if (!blocks.length) return;

  const newBlocks = [];
  blocks.forEach(block => {
    const newEl = document.createElement(tagName);
    while (block.firstChild) newEl.appendChild(block.firstChild);
    block.replaceWith(newEl);
    newBlocks.push(newEl);
  });

  const r = document.createRange();
  r.setStartBefore(newBlocks[0]);
  r.setEndAfter(newBlocks[newBlocks.length - 1]);
  sel.removeAllRanges();
  sel.addRange(r);
}

function toggleList(editor, tagName, isActive) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  const blocks = getSelectedBlocks(editor, range);
  if (!blocks.length) return;

  if (isActive) {
    const listsToClean = new Set();
    const targetPs = [];
    blocks.forEach(block => {
      if (block.tagName === 'LI') {
        listsToClean.add(block.closest('ul, ol'));
      }
    });
    
    listsToClean.forEach(list => {
      if (!list) return;
      const frag = document.createDocumentFragment();
      Array.from(list.children).forEach(item => {
        if (item.tagName === 'LI') {
          const p = document.createElement('p');
          while (item.firstChild) p.appendChild(item.firstChild);
          if (!p.hasChildNodes()) p.innerHTML = '<br>';
          frag.appendChild(p);
          if (blocks.includes(item)) targetPs.push(p);
        } else {
            frag.appendChild(item);
        }
      });
      list.replaceWith(frag);
    });
    
    if (targetPs.length) {
      const r = document.createRange();
      r.setStartBefore(targetPs[0]);
      r.setEndAfter(targetPs[targetPs.length - 1]);
      sel.removeAllRanges();
      sel.addRange(r);
    }
  } else {
    const list = document.createElement(tagName);
    blocks[0].parentNode.insertBefore(list, blocks[0]);
    
    const newLis = [];
    blocks.forEach(block => {
      const li = document.createElement('li');
      while (block.firstChild) li.appendChild(block.firstChild);
      if (!li.hasChildNodes()) li.innerHTML = '<br>';
      list.appendChild(li);
      newLis.push(li);
      block.remove(); 
    });
    
    document.querySelectorAll('ul:empty, ol:empty').forEach(el => el.remove());
    
    const r = document.createRange();
    r.setStartBefore(newLis[0]);
    r.setEndAfter(newLis[newLis.length - 1]);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}

function toggleBlockquote(editor) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return;
  const range = sel.getRangeAt(0);
  
  if (inBlockquote()) {
    const blocks = getSelectedBlocks(editor, range);
    const bqs = new Set();
    blocks.forEach(blk => {
      const bq = blk.closest('blockquote');
      if (bq) bqs.add(bq);
    });
    if (bqs.size > 0) {
      bqs.forEach(bq => {
        const frag = document.createDocumentFragment();
        while (bq.firstChild) frag.appendChild(bq.firstChild);
        bq.replaceWith(frag);
      });
    }
  } else {
    const blocks = getSelectedBlocks(editor, range);
    if (!blocks.length) return;
    
    const bq = document.createElement('blockquote');
    blocks[0].parentNode.insertBefore(bq, blocks[0]);
    blocks.forEach(blk => bq.appendChild(blk));
    
    const r = document.createRange();
    r.selectNodeContents(bq);
    sel.removeAllRanges();
    sel.addRange(r);
  }
}
