import React from 'react';

const styles = {
  container: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderRadius: 16,
    border: '1px solid #334155',
    overflow: 'hidden',
    marginTop: 16,
  },
  header: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: { fontSize: 24 },
  headerTitle: { fontSize: 16, fontWeight: 700, color: '#fff' },
  headerBadge: {
    marginLeft: 'auto',
    background: 'rgba(255,255,255,0.2)',
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
  },
  body: { padding: 24 },
  content: {
    fontSize: 14,
    lineHeight: 1.8,
    color: '#cbd5e1',
  },
  error: {
    color: '#ef4444',
    padding: 24,
    textAlign: 'center',
    fontSize: 14,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid #334155',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  meta: {
    marginTop: 16,
    padding: '12px 16px',
    background: '#0f172a',
    borderRadius: 8,
    display: 'flex',
    gap: 24,
    fontSize: 12,
    color: '#64748b',
  },
};

function parseMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/### (.*?)(\n|$)/g, '<h3 style="color:#e2e8f0;font-size:15px;font-weight:700;margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid #334155">$1</h3>')
    .replace(/## (.*?)(\n|$)/g, '<h2 style="color:#f1f5f9;font-size:17px;font-weight:700;margin:24px 0 12px;padding-bottom:6px;border-bottom:2px solid #3b82f6">$1</h2>')
    .replace(/# (.*?)(\n|$)/g, '<h1 style="color:#f8fafc;font-size:20px;font-weight:800;margin:28px 0 14px">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9;font-weight:600">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color:#94a3b8">$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:#1e293b;padding:2px 6px;border-radius:4px;font-size:13px;color:#38bdf8">$1</code>')
    .replace(/^\- (.*?)$/gm, '<div style="padding:4px 0 4px 20px;position:relative"><span style="position:absolute;left:4px;color:#3b82f6">●</span>$1</div>')
    .replace(/^\d+\. (.*?)$/gm, '<div style="padding:4px 0 4px 20px;color:#cbd5e1">$1</div>')
    .replace(/\n\n/g, '<div style="height:12px"></div>')
    .replace(/\n/g, '<br/>');

  // Handle tables
  if (html.includes('|')) {
    html = html.replace(/(<br\/>)?\|(.*\|)+(<br\/>)?/g, (match) => {
      const rows = match.split('<br/>').filter(r => r.trim() && !r.match(/^\|[\s-|]+\|$/));
      if (rows.length < 1) return match;
      let table = '<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px">';
      rows.forEach((row, i) => {
        const cells = row.split('|').filter(c => c.trim());
        if (cells.length === 0) return;
        const tag = i === 0 ? 'th' : 'td';
        const bg = i === 0 ? 'background:#1e293b;color:#e2e8f0;font-weight:600' : i % 2 ? 'background:#0f172a44' : '';
        table += '<tr>';
        cells.forEach(cell => {
          table += `<${tag} style="padding:8px 12px;border:1px solid #334155;text-align:left;${bg}">${cell.trim()}</${tag}>`;
        });
        table += '</tr>';
      });
      table += '</table>';
      return table;
    });
  }

  return html;
}

export default function AIResponseDisplay({ result, loading, title }) {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.headerIcon}>🤖</span>
          <span style={styles.headerTitle}>{title || 'AI Analysis'}</span>
          <span style={styles.headerBadge}>Processing...</span>
        </div>
        <div style={styles.loading}>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={styles.spinner}></div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>AI is analyzing your request...</div>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>🤖</span>
        <span style={styles.headerTitle}>{title || 'AI Analysis'}</span>
        <span style={styles.headerBadge}>{result.success ? 'Complete' : 'Error'}</span>
      </div>
      {result.success ? (
        <div style={styles.body}>
          <div
            style={styles.content}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(result.result) }}
          />
          {result.model && (
            <div style={styles.meta}>
              <span>Model: {result.model}</span>
              {result.usage && (
                <>
                  <span>Tokens: {result.usage.total_tokens}</span>
                  <span>Prompt: {result.usage.prompt_tokens}</span>
                  <span>Completion: {result.usage.completion_tokens}</span>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={styles.error}>{result.result}</div>
      )}
    </div>
  );
}
