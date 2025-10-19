import { Box, Typography, Paper, Chip, Tooltip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import LinkIcon from '@mui/icons-material/Link';

interface ClaudeMessageDisplayProps {
  content: string;
  role: 'USER' | 'ASSISTANT';
}

// Technical term glossary for non-technical users
const glossary: Record<string, string> = {
  'endpoint': 'En specifik URL/adresse som du henter data fra (f.eks. /api/employees)',
  'api': 'En måde for systemer at tale sammen - du sender forespørgsler og får data tilbage',
  'datastruktur': 'Hvordan data er organiseret - f.eks. hvilke felter og værdier der er i svaret',
  'json': 'Et format til at vise data - ser ud som { "navn": "værdi" }',
  'field': 'Et datafelt - f.eks. "medarbejder_navn" eller "start_tid"',
  'mapping': 'At matche felter mellem systemer - f.eks. deres "employee_id" til vores "medarbejderNummer"',
  'request': 'En forespørgsel du sender til API\'et for at få data',
  'response': 'Svaret du får tilbage fra API\'et med data',
  'authentication': 'At logge ind på API\'et - normalt med en API-nøgle eller brugernavn/kodeord',
};

// Parse message to extract questions and structure
const parseMessage = (content: string) => {
  const sections: Array<{ title?: string; questions: string[]; examples?: string[] }> = [];

  // Split by bold headers (markdown **text**)
  const parts = content.split(/\*\*([^*]+)\*\*/);

  let currentSection: { title?: string; questions: string[]; examples?: string[] } = { questions: [] };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    // Check if this is a title (odd index after split on **)
    if (i % 2 === 1) {
      // Save previous section if it has questions
      if (currentSection.questions.length > 0) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = { title: part, questions: [], examples: [] };
    } else {
      // Extract questions (lines starting with number or -)
      const lines = part.split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (/^\d+\./.test(line.trim()) || /^-/.test(line.trim())) {
          currentSection.questions.push(line.trim());
        } else if (line.includes('eksempel') || line.includes('f.eks') || line.includes('example')) {
          if (!currentSection.examples) currentSection.examples = [];
          currentSection.examples.push(line.trim());
        }
      }
    }
  }

  // Add last section
  if (currentSection.questions.length > 0) {
    sections.push(currentSection);
  }

  return sections;
};

// Get icon based on section title
const getSectionIcon = (title?: string) => {
  if (!title) return <HelpOutlineIcon />;
  const lower = title.toLowerCase();
  if (lower.includes('endpoint') || lower.includes('url')) return <LinkIcon />;
  if (lower.includes('data') || lower.includes('struktur')) return <StorageIcon />;
  if (lower.includes('kode') || lower.includes('eksempel')) return <CodeIcon />;
  return <InfoIcon />;
};

// Highlight technical terms in text
const highlightTerms = (text: string) => {
  const terms = Object.keys(glossary);
  const parts: Array<{ text: string; isTerm: boolean; term?: string }> = [];

  let remainingText = text;
  let lastIndex = 0;

  for (const term of terms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), isTerm: false });
      }
      parts.push({ text: match[0], isTerm: true, term: term.toLowerCase() });
      lastIndex = match.index + match[0].length;
    }
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), isTerm: false });
  }

  if (parts.length === 0) {
    return <span>{text}</span>;
  }

  return (
    <>
      {parts.map((part, idx) =>
        part.isTerm ? (
          <Tooltip key={idx} title={glossary[part.term!]} arrow placement="top">
            <span style={{
              borderBottom: '2px dotted #1976d2',
              cursor: 'help',
              color: '#1976d2',
              fontWeight: 500
            }}>
              {part.text}
            </span>
          </Tooltip>
        ) : (
          <span key={idx}>{part.text}</span>
        )
      )}
    </>
  );
};

const ClaudeMessageDisplay = ({ content, role }: ClaudeMessageDisplayProps) => {
  // Only parse and visualize ASSISTANT messages
  if (role !== 'ASSISTANT') {
    return (
      <Box
        sx={{
          mb: 2,
          p: 2,
          backgroundColor: '#e3f2fd',
          borderRadius: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Dig
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
          {content}
        </Typography>
      </Box>
    );
  }

  const sections = parseMessage(content);

  // If no structured sections found, display as normal message
  if (sections.length === 0) {
    return (
      <Box
        sx={{
          mb: 2,
          p: 2,
          backgroundColor: '#f5f5f5',
          borderRadius: 2,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          Claude
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
          {highlightTerms(content)}
        </Typography>
      </Box>
    );
  }

  // Extract any text before first section
  const introText = content.split(/\*\*[^*]+\*\*/)[0]?.trim();

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
        Claude
      </Typography>

      {/* Intro text if present */}
      {introText && (
        <Paper sx={{ p: 2, mb: 2, backgroundColor: '#f5f5f5' }}>
          <Typography variant="body1">
            {highlightTerms(introText)}
          </Typography>
        </Paper>
      )}

      {/* Visual question sections */}
      {sections.map((section, idx) => (
        <Accordion key={idx} defaultExpanded sx={{ mb: 1 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              backgroundColor: '#e3f2fd',
              borderRadius: '8px 8px 0 0',
              '&:hover': { backgroundColor: '#bbdefb' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getSectionIcon(section.title)}
              <Typography sx={{ fontWeight: 600 }}>
                {section.title || 'Spørgsmål'}
              </Typography>
              <Chip label={`${section.questions.length} spørgsmål`} size="small" />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ backgroundColor: '#fff' }}>
            {/* Questions */}
            <Box component="ul" sx={{ pl: 2, mb: section.examples ? 2 : 0 }}>
              {section.questions.map((question, qIdx) => (
                <Box component="li" key={qIdx} sx={{ mb: 1.5 }}>
                  <Typography variant="body2">
                    {highlightTerms(question)}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Examples if present */}
            {section.examples && section.examples.length > 0 && (
              <Paper sx={{ p: 2, backgroundColor: '#f9f9f9', borderLeft: '4px solid #4caf50' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#4caf50', display: 'block', mb: 1 }}>
                  💡 Eksempel:
                </Typography>
                {section.examples.map((example, eIdx) => (
                  <Typography key={eIdx} variant="body2" sx={{ mb: 0.5 }}>
                    {highlightTerms(example)}
                  </Typography>
                ))}
              </Paper>
            )}
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Glossary help text */}
      <Paper sx={{ p: 1.5, mt: 2, backgroundColor: '#fff3e0', border: '1px solid #ffb74d' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HelpOutlineIcon sx={{ fontSize: '1rem', color: '#f57c00' }} />
          <Typography variant="caption" sx={{ color: '#e65100' }}>
            <strong>Tip:</strong> Hold musen over <span style={{ borderBottom: '2px dotted #1976d2', color: '#1976d2' }}>tekniske ord</span> for at se hvad de betyder
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default ClaudeMessageDisplay;
