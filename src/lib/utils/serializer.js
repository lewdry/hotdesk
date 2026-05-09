export function htmlToMd(html) {
  if (typeof window === 'undefined') return '';
  const root = document.createElement('div');
  root.innerHTML = html;
  return walk(root).replace(/\n{3,}/g, '\n\n').trim();
}

function walk(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.replace(/\u00a0/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const tag  = node.tagName.toLowerCase();
  const kids = () => Array.from(node.childNodes).map(walk).join('');

  switch (tag) {
    case 'body':
    case 'div':
      return Array.from(node.childNodes).map(n => {
        if (n.nodeType === Node.TEXT_NODE) {
          const t = n.textContent.replace(/\u00a0/g, ' ').trim();
          return t ? t + '\n\n' : '';
        }
        return walk(n);
      }).join('');
    case 'p': {
      const c = kids().trim();
      return c ? c + '\n\n' : '\n';
    }
    case 'h1': return `# ${kids().trim()}\n\n`;
    case 'h2': return `## ${kids().trim()}\n\n`;
    case 'h3': return `### ${kids().trim()}\n\n`;
    case 'h4': return `#### ${kids().trim()}\n\n`;
    case 'h5': return `##### ${kids().trim()}\n\n`;
    case 'h6': return `###### ${kids().trim()}\n\n`;
    case 'strong':
    case 'b': { const c = kids(); return c.trim() ? `**${c}**` : ''; }
    case 'em':
    case 'i': { const c = kids(); return c.trim() ? `*${c}*` : ''; }
    case 'u': { return kids(); }
    case 'del':
    case 's':
    case 'strike': { const c = kids(); return c.trim() ? `~~${c}~~` : ''; }
    case 'hr': return '---\n\n';
    case 'br': return '\n';
    case 'a': return `[${kids()}](${node.getAttribute('href') || ''})`;
    case 'code': return node.closest('pre') ? kids() : `\`${kids()}\``;
    case 'pre': return `\`\`\`\n${kids().trim()}\n\`\`\`\n\n`;
    case 'ul': {
      const lis = [...node.children].filter(n => n.tagName === 'LI');
      return lis.length
        ? lis.map(li => {
            // Task list item: contains a checkbox input
            const cb = li.querySelector('input[type="checkbox"]');
            if (cb) {
              const checked = cb.checked ? 'x' : ' ';
              // Text content without the checkbox
              const text = [...li.childNodes]
                .filter(n => !(n.nodeType === Node.ELEMENT_NODE && n.tagName === 'INPUT'))
                .map(walk).join('').trim();
              return `- [${checked}] ${text}`;
            }
            return `- ${[...li.childNodes].map(walk).join('').trim()}`;
          }).join('\n') + '\n\n'
        : kids();
    }
    case 'ol': {
      const lis = [...node.children].filter(n => n.tagName === 'LI');
      return lis.length
        ? lis.map((li, i) => `${i + 1}. ${[...li.childNodes].map(walk).join('').trim()}`).join('\n') + '\n\n'
        : kids();
    }
    case 'li': return kids();
    case 'input': {
      // Handled inside ul case; skip here to avoid duplicate text
      return '';
    }
    case 'img': {
      const alt = node.getAttribute('alt') || '';
      const src = node.getAttribute('src') || '';
      return `![${alt}](${src})`;
    }
    case 'table': {
      const rows = [...node.querySelectorAll('tr')];
      if (!rows.length) return kids();
      const toText = cell => walk(cell).trim().replace(/\|/g, '\\|');
      const headerRow = rows[0];
      const headers = [...headerRow.querySelectorAll('th, td')].map(toText);
      const separator = headers.map(() => '---');
      const bodyRows = rows.slice(1).map(row =>
        [...row.querySelectorAll('th, td')].map(toText)
      );
      const fmt = cols => '| ' + cols.join(' | ') + ' |';
      return [fmt(headers), fmt(separator), ...bodyRows.map(fmt)].join('\n') + '\n\n';
    }
    case 'thead':
    case 'tbody':
    case 'tfoot':
    case 'tr':
    case 'th':
    case 'td': return kids();
    case 'blockquote': {
      const c = kids().trim();
      return c ? c.split('\n').map(l => `> ${l}`).join('\n') + '\n\n' : '';
    }
    case 'span': {
      let c = kids();
      const s = node.getAttribute('style') || '';
      if (/font-weight\s*:\s*(bold|700)/i.test(s))          c = `**${c}**`;
      if (/font-style\s*:\s*italic/i.test(s))               c = `*${c}*`;
      if (/text-decoration[^;]*line-through/i.test(s))      c = `~~${c}~~`;
      return c;
    }
    default: return kids();
  }
}
