export function parseChordPro(text) {
    if (!text) return [];
    const lines = text.split(/\r?\n/);
    let sections = [];
    let currentSection = null;

    const getType = (label) => {
        const l = label.toLowerCase();
        if (l.includes('coro') || l.includes('chorus')) return 'chorus';
        if (l.includes('puente') || l.includes('bridge')) return 'bridge';
        if (l.includes('intro')) return 'intro';
        if (l.includes('outro') || l.includes('final')) return 'outro';
        if (l.includes('pre')) return 'pre_chorus';
        if (l.includes('inst')) return 'interlude';
        return 'verse';
    };

    const flushSection = () => {
        if (currentSection && currentSection.lines.length > 0) {
            sections.push({
                ...currentSection,
                content: currentSection.lines.join('\n').trim()
            });
        }
    };

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line && !currentSection) continue; // Skip leading blank lines

        // Handle Directives {c: Verse 1}
        const directiveMatch = line.match(/^\{(c|comment|soc|start_of_chorus)(?::\s*([^}]+))?\}/i);
        if (directiveMatch) {
            flushSection();
            const dir = directiveMatch[1].toLowerCase();
            const val = directiveMatch[2] || (dir.includes('chorus') ? 'Coro' : 'Sección');
            currentSection = { type: getType(val), label: val, lines: [] };
            continue;
        }

        // Handle ending directives
        const endMatch = line.match(/^\{(eoc|end_of_chorus)\}/i);
        if (endMatch) {
            flushSection();
            currentSection = null;
            continue;
        }

        // Handle blank lines as section breaks if we are in a section
        if (!line) {
            if (currentSection && currentSection.lines.length > 0) {
                flushSection();
                // Create a generic continuation section
                currentSection = { type: currentSection.type, label: currentSection.label, lines: [] };
            }
            continue;
        }

        if (!currentSection) {
            currentSection = { type: 'verse', label: 'Letra', lines: [] };
        }

        currentSection.lines.push(line);
    }

    flushSection();
    return sections;
}
