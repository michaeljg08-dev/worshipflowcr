const text = '{c: Intro}\\n[G]  [Em]  [C]  [D]\\n\\n{c: Verso 1}\\nEl es[G]plendor';
const lines = text.split(/\\r?\\n/);
let sections = [];
let currentSection = null;

const getType = (label) => {
    return 'verse';
};

const flushSection = () => {
    console.log('flushSection called. currentSection:', currentSection ? JSON.stringify(currentSection) : 'null');
    if (currentSection && currentSection.lines.length > 0) {
        sections.push({
            ...currentSection,
            content: currentSection.lines.join('\\n').trim()
        });
        console.log('Pushed to sections. Length:', sections.length);
    } else {
        console.log('Did NOT push. currentSection is falsy or lines is empty');
    }
};

for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    console.log(`\\n--- Line ${i}: "${line}"`);
    if (!line && !currentSection) {
        console.log('Skip leading blank lines');
        continue;
    }

    const directiveMatch = line.match(/^\\{(c|comment|soc|start_of_chorus)(?::\\s*([^}]+))?\\}/i);
    console.log('Directive Match:', !!directiveMatch);
    if (directiveMatch) {
        flushSection();
        const dir = directiveMatch[1].toLowerCase();
        const val = directiveMatch[2] || 'Sección';
        currentSection = { type: getType(val), label: val, lines: [] };
        console.log('Created new currentSection:', currentSection);
        continue;
    }

    // Handle blank lines as section breaks if we are in a section
    if (!line) {
        console.log('Blank line inside section');
        if (currentSection && currentSection.lines.length > 0) {
            flushSection();
            // Create a generic continuation section
            currentSection = { type: currentSection.type, label: currentSection.label, lines: [] };
        }
        continue;
    }

    if (!currentSection) {
        console.log('No currentSection, creating default');
        currentSection = { type: 'verse', label: 'Letra', lines: [] };
    }

    currentSection.lines.push(line);
    console.log('Pushed line. currentSection lines:', currentSection.lines);
}

flushSection();
console.log('\\nFINAL SECTIONS:', JSON.stringify(sections, null, 2));
